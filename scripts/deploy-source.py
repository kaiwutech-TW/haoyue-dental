from pathlib import Path
import json
root=Path('app'); files=[]
for p in root.rglob('*'):
 if not p.is_file() or any(x in p.parts for x in ['node_modules','.next','.git','.eve','.data','.vercel']):continue
 if p.name.startswith('.env') or p.name.endswith('.tsbuildinfo') or p.suffix not in ['.ts','.tsx','.css','.json','.mjs','.svg','.md']:continue
 if p.name in ['AGENTS.md','CLAUDE.md','README.md'] or p.parts[1] in ['tests','components'] or ('s' in p.parts[2:3]) or '_components' in p.parts:continue
 if p.name=='eve-agent.ts':continue
 files.append({'file':str(p.relative_to(root)),'data':p.read_text()})
Path('/tmp/haoyue-deploy-files.json').write_text(json.dumps(files))
print(len(files))
