"""Build phone texture derivatives from the bundled, credited reference maps.

Run with Pillow installed: python3 optimize_textures.py. No remote assets are used.
Original maps, projection, alpha channels, and attribution remain unchanged.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'assets'
OUTPUT = ASSETS / 'optimized'
NORMALS = ['earth-normal.png', 'mars-normal.png', 'mercury-normal.png', 'moon-normal.png']


def main():
    OUTPUT.mkdir(exist_ok=True)
    credits = json.loads((ASSETS / 'credits.json').read_text())
    revision = (ROOT / 'celestia-revision.txt').read_text().strip()
    files = [name for name in credits if (ASSETS / name).suffix in {'.jpg', '.png'}]
    manifest = {'version': 1, 'note': 'Resampled reference maps; not live surface imagery.', 'textures': {}}
    derivative_credits = {}
    for name in files + NORMALS:
        source = ASSETS / name
        with Image.open(source) as original:
            # Data maps stay lossless. Keep alpha on ring and moon reference maps.
            mode = 'RGBA' if 'A' in original.mode else 'RGB'
            image = original.convert(mode)
            entry = {'sourceBytes': source.stat().st_size, 'sourceSize': list(image.size), 'colorSpace': 'linear' if name in NORMALS else 'srgb'}
            for tier, width in [('small', 1024), ('detail', 2048)]:
                ratio = min(1, width / image.width)
                resized = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)
                target = OUTPUT / f'{source.stem}-{tier}.webp'
                resized.save(target, format='WEBP', quality=86, method=6, lossless=name in NORMALS or 'ring_alpha' in name, exact=True)
                entry[tier] = {'path': 'optimized/' + target.name, 'bytes': target.stat().st_size, 'width': resized.width, 'height': resized.height}
                credit = credits.get(name, {'source': f'https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/{revision}/textures/medres/{name}', 'credit': 'Celestia contributors; see CELESTIA-README', 'license': 'See CELESTIA-LICENSE.md and LICENSES/', 'note': 'Resampled Celestia normal map; numerical channels preserved with lossless WebP.'})
                derivative_credits[target.name] = {**credit, 'original': name, 'derivative': 'Lanczos resampling and WebP encoding; equirectangular mapping preserved.'}
            manifest['textures'][name] = entry
    (ASSETS / 'texture-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (OUTPUT / 'credits.json').write_text(json.dumps(derivative_credits, indent=2) + '\n')
    source_bytes = sum(x['sourceBytes'] for x in manifest['textures'].values())
    for tier in ['small', 'detail']:
        total = sum(x[tier]['bytes'] for x in manifest['textures'].values())
        print(f'{tier}: {total:,} bytes vs {source_bytes:,} originals ({(1-total/source_bytes)*100:.1f}% smaller)')


if __name__ == '__main__':
    main()
