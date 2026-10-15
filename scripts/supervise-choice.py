"""Restart project-only inference and Quick Tunnel; publish a private CAS endpoint.

No paid cloud calls. The website still requires a separate bearer key for inference.
The endpoint registry is not included in any patient or desk API response.
"""
import json,os,re,signal,subprocess,time,urllib.request,threading,ssl,certifi
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ENV={}
for line in (ROOT/'.env').read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1)
  if k in {'DECISION_ADAPTER_KEY','CLINIC_STORE_SECRET','SUPABASE_URL'}:ENV[k]=v.strip().strip('"').strip("'")
TLS=ssl.create_default_context(cafile=certifi.where())
children=[]
def stop(*_):
 for child in children:
  if child.poll() is None:child.terminate()
 for child in children:
  try:child.wait(timeout=8)
  except subprocess.TimeoutExpired:child.kill()
 raise SystemExit(0)
signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
def health(url):
 req=urllib.request.Request(url,headers={'Authorization':'Bearer '+ENV['DECISION_ADAPTER_KEY']})
 with urllib.request.urlopen(req,timeout=12,context=TLS) as response: data=json.load(response)
 return data.get('ready') and data.get('adapterSha256')=='4940141c0e05473b3cc1bb77ea8ab341deb6183c1a6dcc4039136c8ab0fac857'
def remote(body):
 req=urllib.request.Request(ENV['SUPABASE_URL']+'/functions/v1/clinic-store',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-clinic-secret':ENV['CLINIC_STORE_SECRET']})
 with urllib.request.urlopen(req,timeout=15,context=TLS) as response:return json.load(response)
def publish(url):
 assert re.fullmatch(r'https://[a-z0-9-]+\.trycloudflare\.com/decision',url)
 for _ in range(8):
  row=remote({'op':'haoyue_read'});body=row['body'];body['inferenceEndpoint']=url
  if remote({'op':'haoyue_cas','p_revision':row['revision'],'p_body':body}):return
 raise RuntimeError('Endpoint registry contention')
def log(msg):print(time.strftime('%Y-%m-%dT%H:%M:%S'),msg,flush=True)
def main():
 log('Starting authenticated inference supervisor')
 server=subprocess.Popen([str(ROOT/'.venv-mlx/bin/python'),str(ROOT/'scripts/run-choice-server.py')],cwd=ROOT)
 children.append(server)
 for _ in range(60):
  if server.poll() is not None:raise RuntimeError('Inference process exited')
  try:
   if health('http://127.0.0.1:8766/health'):break
  except Exception:pass
  time.sleep(2)
 else:raise RuntimeError('Inference readiness timed out')
 tunnel=subprocess.Popen(['/opt/homebrew/bin/cloudflared','tunnel','--edge-ip-version','4','--protocol','http2','--url','http://127.0.0.1:8766','--no-autoupdate'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 children.append(tunnel)
 registered=False
 pending=None
 def watch():
  while server.poll() is None:time.sleep(2)
  os.kill(os.getpid(),signal.SIGTERM)
 threading.Thread(target=watch,daemon=True).start()
 for line in tunnel.stdout:
  with (ROOT/'artifacts/private/tunnel.log').open('a') as out:out.write(line)
  match=re.search(r'https://[a-z0-9-]+\.trycloudflare\.com',line)
  if match:
   pending=match.group(0);(ROOT/'artifacts/private/pending-endpoint.txt').write_text(pending)
   log('Tunnel URL received; waiting for edge connection')
  if 'Registered tunnel connection' in line and pending and not registered:
   # Local readiness proved the adapter/key; the tunnel process now confirms edge connectivity.
   # Remote application calls validate the complete TLS/auth/model-response path.
   publish(pending+'/decision');registered=True;log('Edge connection registered; private endpoint registry updated')
  if server.poll() is not None:raise RuntimeError('Inference process exited')
 raise RuntimeError('Tunnel process exited')
if __name__=='__main__':
 try:main()
 except Exception as e:
  log(type(e).__name__+': service will restart; no credentials logged')
  stop()
