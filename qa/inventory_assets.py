"""Enumerate distribution imagery and its local evidence; no legal clearance inferred."""
import csv,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
credits=json.loads((ROOT/'assets/credits.json').read_text());optimized=json.loads((ROOT/'assets/optimized/credits.json').read_text())
for data in optimized.values():credits.setdefault(data['original'],data)
rows=[]
def row(path,original,data,bundled):
    sidecar=ROOT/'assets'/f'{original}.license';license=data.get('license','Unknown');evidence=data.get('source','')
    if sidecar.exists():
        text=sidecar.read_text();license=re.search(r'SPDX-License-Identifier:\s*(.+)',text)[1];evidence+=' ; assets/'+sidecar.name
    if 'CC-BY-SA' in license:review='YES — asset ShareAlike/attribution and store redistribution terms require publisher review'
    elif license.startswith('See') or license=='Unknown':review='YES — exact per-file grant unresolved; README/GPL software notice is not a data-file grant'
    else:review='Attribution/source verified in local metadata; publisher must retain notices and confirm provenance'
    rows.append(dict(path=path,original=original,license=license,evidence=evidence,native=bundled,review=review))
for name,data in sorted(credits.items()):
    row('assets/'+name,name,data,'NO — web/source original')
for name,data in sorted(optimized.items()):
    row('assets/optimized/'+name,data['original'],data,'YES')
for folder in ['assets/icons','android/app/src/main/res','ios/App/App/Assets.xcassets']:
    for p in sorted((ROOT/folder).rglob('*.png')):
        rows.append(dict(path=str(p.relative_to(ROOT)),original='assets/icons/orbit-512.png',license='ORBIT artwork — publisher ownership not independently established',evidence='scripts/native_artwork.py creates native derivatives from ORBIT mark',native='YES',review='YES — publisher confirm source artwork ownership / permission'))
rows.append(dict(path='assets/three.min.js',original='Three.js r160',license='MIT',evidence='Embedded header; LICENSES/Three.js-MIT.txt; https://github.com/mrdoob/three.js/blob/r160/LICENSE',native='YES',review='Retain MIT copyright/license text; existing native license file verified'))
for name in ['assets/space/catalog.json','assets/space/nearby.json','assets/solar-directory.json','assets/planet-properties.json']:
    rows.append(dict(path=name,original='NASA/JPL/SIMBAD catalog or physical-property snapshot',license='Data provenance, not imagery permission',evidence='README.md and source/retrievedUTC fields',native='YES',review='YES — publisher review data-service acknowledgement/usage and source references'))
for name in ['assets/credits.json','assets/optimized/credits.json','assets/texture-manifest.json']:
    rows.append(dict(path=name,original='Texture metadata and derived dimensions',license='Metadata records underlying asset grants',evidence='Source mappings and credits in file',native='YES',review='Check that metadata remains consistent with the exact release assets; not a separate texture grant'))
with (ROOT/'qa/asset-license-inventory.csv').open('w',newline='') as file:
    writer=csv.DictWriter(file,fieldnames=['path','original','license','evidence','native','review']);writer.writeheader();writer.writerows(rows)
unknown=[(name,data) for name,data in credits.items() if data.get('license','').startswith('See') and not (ROOT/'assets'/f'{name}.license').exists()]
sa=[(name,data) for name,data in credits.items() if (ROOT/'assets'/f'{name}.license').exists() and 'CC-BY-SA' in (ROOT/'assets'/f'{name}.license').read_text()]
text='''# Asset license clearance — 12 October 2026\n\nThis is an evidence inventory, not legal clearance. The CSV lists each original, every native WebP derivative, all native/icon PNGs, the vendored renderer and data catalogs. Copies in generated public/native output directories inherit the same entry. No image was replaced or removed.\n\n## Unresolved exact grants — launch gate FAILED\n\nThe following original files have no adjacent per-file license. Each small/detail derivative is bundled in both native apps. Celestia’s software GPL notice explicitly directs readers to separate data-file metadata; it cannot be treated as blanket permission for these maps. Confirm the exact upstream commit, contributor grant, attribution and derivative terms before commercial distribution. A read-only check of all 12 exact pinned image URLs plus `.license` returned HTTP 404; receipts are in `qa/upstream-license-results.json`. This establishes missing sidecars at those paths, not absence of every possible permission elsewhere.\n\n| Original (web/source) | Native derivatives requiring manual verification | Evidence |\n|---|---|---|\n'''
for name,data in unknown:
    derivatives=[f'assets/optimized/{f}' for f,v in optimized.items() if v['original']==name]
    text+=f"| assets/{name} | "+' ; '.join(derivatives)+f" | [Pinned source]({data['source']}) |\n"
text+='''\n## Known ShareAlike assets — publisher review still required\n\nLocal sidecars identify CC-BY-SA-4.0. Preserve all named contributors, modification notices and asset-level ShareAlike obligations. Have the publisher verify how the adapted assets are supplied and how store terms/technical restrictions interact with the license. This is not a claim that the entire application must have the texture’s license.\n\n| Original | Native derivatives | Sidecar |\n|---|---|---|\n'''
for name,data in sa:
    text+=f'| assets/{name} | '+' ; '.join('assets/optimized/'+f for f,v in optimized.items() if v['original']==name)+f' | assets/{name}.license |\n'
text+='''\n## Other identified permissions and remaining publisher actions\n\n- Solar System Scope’s 13 source textures / 26 derivatives have recorded CC BY 4.0 credits and change notices. Its [official texture policy](https://www.solarsystemscope.com/textures/) permits commercial adaptation subject to attribution. Check that the intended release retains visible credits and the license link; no live surface imagery claim is made.\n- Phobos, Ganymede, Titan and Triton sidecars specify CC BY 3.0; Io and Hyperion specify CC BY 4.0; Deimos specifies CC0. Full contributor strings remain in the shipped sidecars. Keep them, and review display/export attribution.\n- Three.js MIT header and `LICENSES/Three.js-MIT.txt` are present, including in the prior compiled APK. Pinned Capacitor full MIT texts and SDK_NOTICES.md are now prepared for the next candidate; complete the transitive SDK notice inventory and inspect the final package, not just this imagery CSV.\n- All 4 web/app icons and 30 native PNGs are enumerated in the CSV. Native art was generated from `assets/icons/orbit-512.png`; the publisher must confirm ownership/permission for that source mark. A generation script does not establish ownership.\n- `assets/space/catalog.json`, `nearby.json`, `assets/solar-directory.json` and `planet-properties.json` carry scientific source fields. Verify service acknowledgements and dataset-use requirements. The nine telescope images below are remote, not bundled or saved offline; per-image exceptions and full credit still matter when displayed.\n- Canvas screenshot export excludes DOM credit panels. Before public distribution, review exported textured renders and supply associated attribution/change notices in a form that travels with them. Screenshots/marketing imagery are a separate distribution context; credits in the installed app alone must not be assumed sufficient.\n- License text files mentioning noncommercial licenses are upstream metadata, not proof any particular shipped texture has that license. Conversely, a NASA contributor credit does not establish that a composite map is public domain.\n\n## Remote recorded imagery — manual per-image exception/credit check\n\n| Object | Observation page | Stored credit | Stored license |\n|---|---|---|---|\n'''
for o in json.loads((ROOT/'assets/space/catalog.json').read_text())['objects']:
    text+=f"| {o['name']} | [{o['id']}]({o.get('imageSource','')}) | {o.get('imageCredit','')} | {o.get('imageLicense','')} |\n"
text+='''\nCheck [ESO’s image policy](https://www.eso.org/public/outreach/copyright/) and [ESA/Hubble’s policy](https://esahubble.org/copyright/), plus each observation page’s exceptions. Preserve full visible credit, links and modification disclosure. Do not imply institutional endorsement. Publisher sign-off and per-file evidence must be saved alongside the final release inventory; missing grants remain launch blockers.\n'''
(ROOT/'ASSET_LICENSE_AUDIT.md').write_text(text)
print('Inventory rows',len(rows),'unresolved original maps',len(unknown),'unresolved native derivatives',sum(v['original'] in dict(unknown) for v in optimized.values()),'ShareAlike originals',len(sa))
