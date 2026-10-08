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
STATIC_FILES=['index.html','app.js','mobile.js','solar-orbits.js','style.css','space.html','space.js','space-model.js','space.css','README.md','CELESTIA-README','CELESTIA-LICENSE.md','CELESTIA-REUSE.toml']

# Prune generated files whose sources were removed, including obsolete features.
for target in sorted(OUTPUT.rglob('*'), key=lambda path: len(path.parts), reverse=True):
    relative=target.relative_to(OUTPUT)
    retained=relative.parts[0] in {'assets','LICENSES'} or str(relative) in STATIC_FILES
    if target.is_file() and (not retained or not (ROOT/relative).is_file()):
        target.unlink()
    elif target.is_dir() and not any(target.iterdir()):
        target.rmdir()

for name in STATIC_FILES:
    source=ROOT/name
    if source.exists():copy_if_changed(source,OUTPUT/name)
for name in ['assets','LICENSES']:
    shutil.copytree(ROOT/name,OUTPUT/name,dirs_exist_ok=True,copy_function=copy_if_changed)
print('Static browser files prepared in public/. Python and kernels stay in the API bundle.')
