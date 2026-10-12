"""Apply the shared ORBIT mark to generated native icon/splash resources."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
icon=Image.open(root/'assets/icons/orbit-512.png').convert('RGB')
for path in (root/'android/app/src/main/res').glob('mipmap-*/*.png'):
    with Image.open(path) as old:size=old.size
    icon.resize(size,Image.Resampling.LANCZOS).save(path)
for path in (root/'android/app/src/main/res').glob('drawable-*/splash.png'):
    with Image.open(path) as old:size=old.size
    canvas=Image.new('RGB',size,'#060d14');side=int(min(size)*.24);mark=icon.resize((side,side),Image.Resampling.LANCZOS);canvas.paste(mark,((size[0]-side)//2,(size[1]-side)//2));canvas.save(path)
icon.resize((1024,1024),Image.Resampling.LANCZOS).save(root/'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
for path in (root/'ios/App/App/Assets.xcassets/Splash.imageset').glob('*.png'):
    canvas=Image.new('RGB',(2732,2732),'#060d14');mark=icon.resize((600,600),Image.Resampling.LANCZOS);canvas.paste(mark,(1066,1066));canvas.save(path)
