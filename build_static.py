"""Copy only browser files to Vercel's public output directory."""
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parent
OUTPUT=ROOT/'public'
OUTPUT.mkdir(exist_ok=True)
for name in ['index.html','app.js','style.css','city.html','city.js','city.css','README.md','CELESTIA-README','CELESTIA-LICENSE.md','CELESTIA-REUSE.toml']:
    source=ROOT/name
    if source.exists():shutil.copy2(source,OUTPUT/name)
for name in ['assets','LICENSES']:
    shutil.copytree(ROOT/name,OUTPUT/name,dirs_exist_ok=True)
print('Static browser files prepared in public/. Python and kernels stay in the API bundle.')
