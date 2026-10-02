"""Copy only browser files to Vercel's public output directory."""
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parent
OUTPUT=ROOT/'public'
OUTPUT.mkdir(exist_ok=True)

def copy_if_changed(source,target):
    source=Path(source);target=Path(target)
    if target.exists():
        before=source.stat();after=target.stat()
        if before.st_size==after.st_size and before.st_mtime_ns==after.st_mtime_ns:return str(target)
    return shutil.copy2(source,target)
for name in ['index.html','app.js','mobile.js','solar-orbits.js','style.css','city.html','city.js','city.css','README.md','CELESTIA-README','CELESTIA-LICENSE.md','CELESTIA-REUSE.toml']:
    source=ROOT/name
    if source.exists():copy_if_changed(source,OUTPUT/name)
for name in ['assets','LICENSES']:
    shutil.copytree(ROOT/name,OUTPUT/name,dirs_exist_ok=True,copy_function=copy_if_changed)
print('Static browser files prepared in public/. Python and kernels stay in the API bundle.')
