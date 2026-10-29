from pathlib import Path
import json,hashlib,shutil,sys
manifest=json.loads(Path('dist/media-manifest.json').read_text())
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path('media-source')
target=Path('dist/media');target.mkdir(exist_ok=True)
seen=set()
for item in manifest['items']:
 if item['sha'] in seen:continue
 data=(root/item['sourcePath']).read_bytes()
 digest=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
 assert digest==item['sha'],f"SHA inválido para MD{item['id']}"
 assert data[:6] in (b'GIF87a',b'GIF89a'),f"Formato inválido MD{item['id']}"
 (target/(item['sha']+'.gif')).write_bytes(data);seen.add(item['sha'])
assert len(manifest['items'])==445 and len(seen)==442
print(f'445 vínculos, {len(seen)} GIFs verificados por SHA e assinatura.')
