# Asset license clearance — 12 October 2026

This is an evidence inventory, not legal clearance. The CSV lists each original, every native WebP derivative, all native/icon PNGs, the vendored renderer and data catalogs. Copies in generated public/native output directories inherit the same entry. No image was replaced or removed.

## Unresolved exact grants — launch gate FAILED

The following original files have no adjacent per-file license. Each small/detail derivative is bundled in both native apps. Celestia’s software GPL notice explicitly directs readers to separate data-file metadata; it cannot be treated as blanket permission for these maps. Confirm the exact upstream commit, contributor grant, attribution and derivative terms before commercial distribution. A read-only check of all 12 exact pinned image URLs plus `.license` returned HTTP 404; receipts are in `qa/upstream-license-results.json`. This establishes missing sidecars at those paths, not absence of every possible permission elsewhere.

| Original (web/source) | Native derivatives requiring manual verification | Evidence |
|---|---|---|
| assets/europa.jpg | assets/optimized/europa-small.webp ; assets/optimized/europa-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/hires/europa.jpg) |
| assets/callisto.jpg | assets/optimized/callisto-small.webp ; assets/optimized/callisto-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/hires/callisto.jpg) |
| assets/mimas.jpg | assets/optimized/mimas-small.webp ; assets/optimized/mimas-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/hires/mimas.jpg) |
| assets/enceladus.jpg | assets/optimized/enceladus-small.webp ; assets/optimized/enceladus-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/hires/enceladus.jpg) |
| assets/tethys.jpg | assets/optimized/tethys-small.webp ; assets/optimized/tethys-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/hires/tethys.jpg) |
| assets/dione.jpg | assets/optimized/dione-small.webp ; assets/optimized/dione-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/hires/dione.jpg) |
| assets/rhea.jpg | assets/optimized/rhea-small.webp ; assets/optimized/rhea-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/hires/rhea.jpg) |
| assets/iapetus.jpg | assets/optimized/iapetus-small.webp ; assets/optimized/iapetus-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/hires/iapetus.jpg) |
| assets/earth-normal.png | assets/optimized/earth-normal-small.webp ; assets/optimized/earth-normal-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/medres/earth-normal.png) |
| assets/mars-normal.png | assets/optimized/mars-normal-small.webp ; assets/optimized/mars-normal-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/medres/mars-normal.png) |
| assets/mercury-normal.png | assets/optimized/mercury-normal-small.webp ; assets/optimized/mercury-normal-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/medres/mercury-normal.png) |
| assets/moon-normal.png | assets/optimized/moon-normal-small.webp ; assets/optimized/moon-normal-detail.webp | [Pinned source](https://raw.githubusercontent.com/CelestiaProject/CelestiaContent/3ed5836133901114a9cb4a2ea35751b274a464a1/textures/medres/moon-normal.png) |

## Known ShareAlike assets — publisher review still required

Local sidecars identify CC-BY-SA-4.0. Preserve all named contributors, modification notices and asset-level ShareAlike obligations. Have the publisher verify how the adapted assets are supplied and how store terms/technical restrictions interact with the license. This is not a claim that the entire application must have the texture’s license.

| Original | Native derivatives | Sidecar |
|---|---|---|
| assets/miranda.jpg | assets/optimized/miranda-small.webp ; assets/optimized/miranda-detail.webp | assets/miranda.jpg.license |
| assets/ariel.jpg | assets/optimized/ariel-small.webp ; assets/optimized/ariel-detail.webp | assets/ariel.jpg.license |
| assets/umbriel.jpg | assets/optimized/umbriel-small.webp ; assets/optimized/umbriel-detail.webp | assets/umbriel.jpg.license |
| assets/titania.jpg | assets/optimized/titania-small.webp ; assets/optimized/titania-detail.webp | assets/titania.jpg.license |
| assets/oberon.jpg | assets/optimized/oberon-small.webp ; assets/optimized/oberon-detail.webp | assets/oberon.jpg.license |

## Other identified permissions and remaining publisher actions

- Solar System Scope’s 13 source textures / 26 derivatives have recorded CC BY 4.0 credits and change notices. Its [official texture policy](https://www.solarsystemscope.com/textures/) permits commercial adaptation subject to attribution. Check that the intended release retains visible credits and the license link; no live surface imagery claim is made.
- Phobos, Ganymede, Titan and Triton sidecars specify CC BY 3.0; Io and Hyperion specify CC BY 4.0; Deimos specifies CC0. Full contributor strings remain in the shipped sidecars. Keep them, and review display/export attribution.
- Three.js MIT header and `LICENSES/Three.js-MIT.txt` are present, including in the prior compiled APK. Pinned Capacitor full MIT texts and SDK_NOTICES.md are now prepared for the next candidate; complete the transitive SDK notice inventory and inspect the final package, not just this imagery CSV.
- All 4 web/app icons and 30 native PNGs are enumerated in the CSV. Native art was generated from `assets/icons/orbit-512.png`; the publisher must confirm ownership/permission for that source mark. A generation script does not establish ownership.
- `assets/space/catalog.json`, `nearby.json`, `assets/solar-directory.json` and `planet-properties.json` carry scientific source fields. Verify service acknowledgements and dataset-use requirements. The nine telescope images below are remote, not bundled or saved offline; per-image exceptions and full credit still matter when displayed.
- Canvas screenshot export excludes DOM credit panels. Before public distribution, review exported textured renders and supply associated attribution/change notices in a form that travels with them. Screenshots/marketing imagery are a separate distribution context; credits in the installed app alone must not be assumed sufficient.
- License text files mentioning noncommercial licenses are upstream metadata, not proof any particular shipped texture has that license. Conversely, a NASA contributor credit does not establish that a composite map is public domain.

## Remote recorded imagery — manual per-image exception/credit check

| Object | Observation page | Stored credit | Stored license |
|---|---|---|---|
| Andromeda · M31 | [m31](https://esahubble.org/images/heic1502a/) | NASA, ESA, J. Dalcanton (University of Washington, USA), B. F. Williams (University of Washington, USA), L. C. Johnson (University of Washington, USA), the PHAT team, and R. Gendler. | CC BY 4.0 |
| Triangulum · M33 | [m33](https://esahubble.org/images/heic1901a/) | NASA, ESA, and M. Durbin, J. Dalcanton, and B. F. Williams (University of Washington) | CC BY 4.0 |
| Bode’s Galaxy · M81 | [m81](https://esahubble.org/images/heic0710a/) | NASA, ESA and the Hubble Heritage Team (STScI/AURA). Acknowledgment: A. Zezas and J. Huchra (Harvard-Smithsonian Center for Astrophysics) | CC BY 4.0 |
| Cigar Galaxy · M82 | [m82](https://esahubble.org/images/heic0604a/) | NASA, ESA and the Hubble Heritage Team (STScI/AURA). Acknowledgment: J. Gallagher (University of Wisconsin), M. Mountain (STScI) and P. Puxley (NSF). | CC BY 4.0 |
| Virgo A · M87 | [m87](https://esahubble.org/images/heic2411b/) | NASA, ESA, A. Lessing (Stanford University), E. Baltz (Stanford University), M. Shara (AMNH), J. DePasquale (STScI) | CC BY 4.0 |
| Large Magellanic Cloud | [lmc](https://www.eso.org/public/images/eso1914a/) | ESO/VMC Survey | CC BY 4.0 |
| Small Magellanic Cloud | [smc](https://www.eso.org/public/images/eso1714a/) | ESO/VISTA VMC | CC BY 4.0 |
| Sagittarius A* | [sgr-a](https://www.eso.org/public/images/eso2208-eht-mwa/) | EHT Collaboration | CC BY 4.0 |
| M87* | [m87-star](https://www.eso.org/public/images/eso1907a/) | EHT Collaboration | CC BY 4.0 |

Check [ESO’s image policy](https://www.eso.org/public/outreach/copyright/) and [ESA/Hubble’s policy](https://esahubble.org/copyright/), plus each observation page’s exceptions. Preserve full visible credit, links and modification disclosure. Do not imply institutional endorsement. Publisher sign-off and per-file evidence must be saved alongside the final release inventory; missing grants remain launch blockers.
