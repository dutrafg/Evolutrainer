from pathlib import Path
import json
root=Path('.')
files=[]
for p in root.rglob('*'):
 if not p.is_file():continue
 if any(x in p.parts for x in ['media-source','media','node_modules','.git','.gradle','build','capacitor-cordova-android-plugins','test-results']):continue
 if p.parts[0]=='.openai':continue
 if str(p)=='dist/native.js':continue
 if p.name in ['local.properties','beta.keystore','.DS_Store']:continue
 if str(p).startswith('android/app/src/main/assets/'):continue
 files.append(str(p))
print(json.dumps(sorted(files)))
