"""Restricted decision-only endpoint; no filesystem, tools or generation APIs."""
import asyncio,hmac,os,time
from contextlib import asynccontextmanager
from collections import deque
from fastapi import FastAPI,Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel,ConfigDict,Field,ValidationError
from inference.choice import ChoiceModel

key=os.environ.get('DECISION_ADAPTER_KEY','')
if len(key)<32:raise RuntimeError('A project-specific adapter key of at least 32 characters is required')
model=None
lock=asyncio.Lock();calls=deque()
@asynccontextmanager
async def lifespan(app):
 global model
 model=ChoiceModel();model.predict('我要改期')
 yield
app=FastAPI(lifespan=lifespan,docs_url=None,redoc_url=None,openapi_url=None)
class Input(BaseModel):
 model_config=ConfigDict(extra='forbid')
 text:str=Field(min_length=1,max_length=800)
@app.middleware('http')
async def auth(req:Request,call_next):
 if not hmac.compare_digest(req.headers.get('authorization',''),f'Bearer {key}'):
  return JSONResponse({'error':'Unauthorized'},status_code=401)
 return await call_next(req)
@app.get('/health')
async def health():
 return {'ready':model is not None,'version':model.config['version'],'adapterSha256':model.adapter_hash}
@app.post('/decision')
async def decision(req:Request):
 body=bytearray()
 async for part in req.stream():
  body.extend(part)
  if len(body)>4096:return JSONResponse({'error':'Request too large'},status_code=413)
 try:data=Input.model_validate_json(body)
 except ValidationError:return JSONResponse({'error':'Invalid decision request'},status_code=422)
 now=time.monotonic()
 while calls and now-calls[0]>60:calls.popleft()
 if len(calls)>=30 or lock.locked():return JSONResponse({'error':'Busy; no inference performed'},status_code=429)
 calls.append(now)
 async with lock:
  try:return await asyncio.to_thread(model.predict,data.text)
  except ValueError:return JSONResponse({'error':'Decision input exceeds limit'},status_code=422)
  except Exception:return JSONResponse({'error':'Decision service unavailable'},status_code=503)
