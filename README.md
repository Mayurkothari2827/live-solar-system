# Live solar system

Open http://127.0.0.1:8770/ while `server.py` is running. Double-click `start.command` to restart it on this Mac. The server listens only on this computer. For a new machine, install `requirements.txt` in a Python environment, then run `python server.py`. Internet is needed for ephemeris refresh; loaded data remains usable within its stated window.

## Motion and orientation

- Body-center states come from [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/). The eight planets use their actual center IDs, not planetary-system barycenters. Moon states are relative to their parent planet, then combined with that planet's heliocentric state.
- Coordinates are geometric J2000 ecliptic, with no light-time or stellar-aberration correction. This is a view of simultaneous positions at the displayed epoch, not an Earth-observer sky chart.
- UTC timestamps are passed explicitly to Horizons. SPICE uses its leap-second kernel to convert UTC into ephemeris time for orientation.
- Each 48-hour data window contains 577 samples per body at five-minute intervals. Position and velocity are interpolated with cubic Hermite interpolation. This introduces a small numerical interpolation error in addition to the source ephemeris uncertainty. `validation.json` records independent midpoint checks; those checks do not constitute a universal accuracy bound.
- Rotation and tilt are calculated using [NAIF SPICE](https://naif.jpl.nasa.gov/naif/) and `pck00011.tpc`. Earth uses ITRF93 with a high-precision Earth orientation kernel. The Moon uses the DE440 binary libration kernel and the mean-Earth lunar frame. Quaternions are interpolated between one-minute samples.
- Hyperion tumbles chaotically. Its position is included, but no reliable instantaneous orientation is claimed or animated. Gas giants use IAU reference rotation, and the Sun uses its reference frame; differential surface/cloud rotation is not reconstructed.
- Included moons: Moon; Phobos, Deimos; Io, Europa, Ganymede, Callisto; Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Hyperion, Iapetus; Ariel, Umbriel, Titania, Oberon, Miranda; Triton. This is 21 moons, not every known natural satellite.

## Scale and rendering

Close-up and moon-system views preserve physical body radii, flattening/triaxial radii, and inter-body distances. **All planets** opens a cinematic overview with recognizable textured surfaces, Saturn's rings, a soft illustrative solar halo, and orbital guides. Its radial display coordinate is `2.4 + 3 × ln(1 + distanceAU / 0.35)` for planets, with the Sun at the origin. This compresses spacing while preserving current orbital direction and inclination. Body sizes are enlarged, with a modest screen-size floor; neither spacing nor visible size in this mode is a measurement. The scene labels this scaling explicitly.

The overview selector offers **Real distances** (proportional positions and enlarged bodies) and **True scale** (physical sizes and distances). The checkbox to enlarge planets provides the same true-scale escape. Display settings do not change the source values in telemetry, actual simulation epoch, surface orientation, or sunlight direction. Enlarged bodies can overlap at close apparent alignments; choose a body for a physical close-up. Camera position is freely chosen, not an Earth-based observing location.

Brighter short trajectories are the loaded 48-hour ephemeris. Faint full overview guides are instantaneous two-body osculating ellipses derived from each loaded heliocentric position and velocity, using [JPL's DE440 solar gravitational parameter](https://ssd.jpl.nasa.gov/astro_par.html). They preserve eccentricity and inclination and use the same display transform as the bodies. They are visual guides, not future JPL predictions; invalid or unbound states get no invented curve. Guides are rebuilt at a change of view or presentation scale and at intervals of 30 simulated minutes. Body labels and enlarged overview sizes are visual aids. Lighting direction follows the Sun. Eclipse shading approximates spherical occulters and the Sun's angular extent; this is not a precision eclipse-contact calculator. Atmosphere rendering, ocean reflectance, the solar halo, exposure adaptation, and the decorative star field are visual approximations. Saturn's rings cast/receive simplified shading; not all faint planetary rings are modeled.

Surface maps and Earth clouds/night lights are static reference imagery. They are not today's live weather or current storm positions. Map alignment, unobserved terrain, and image processing limit surface realism independently of positional accuracy.

## Phone observatory

The ORBIT interface keeps the 3D view on screen with touch-sized controls, safe-area spacing, and compact **Telemetry / Moons / Time / Data** drawers. The UTC clock mirrors the actual simulation epoch. Real time, accelerated playback, and pause have distinct labels; position-data availability is shown separately. Landscape controls adapt to shorter screens. All source and accuracy notes remain accessible in Data.

Phones use a rendering profile capped at 30 frames per second, 1.5 device-pixel ratio, 64 × 40 sphere segments, and 800 decorative stars. These limits reduce graphics work; they do not change the astronomical interpolation, orientation, or physical scale. Elapsed time is accumulated across skipped draws, so accelerated playback keeps its chosen rate. Background tabs suspend graphics and playback; live mode returns to current UTC when the page is visible again. Desktop rendering keeps higher geometry detail and is capped at 60 frames per second.

The selected surface uses packaged 2k WebP maps; other visible bodies use 1k maps. Off-screen maps load when needed and phones release maps from previous systems. Default Earth startup textures total 959,394 bytes, compared with 35,069,137 bytes for the previous eager Earth/Moon/ring requests. Original reference maps remain available for desktop detail. Normal maps and Saturn ring alpha use lossless encoding after resizing; source credits are retained in `assets/optimized/credits.json`. To reproduce the derivatives offline, install Pillow and run `python3 optimize_textures.py`.

## Data service

Horizons requests are serialized and cached. The server checks hourly and refreshes only when the current window is near its end. The browser checks the local cache every five minutes and does not call NASA for each frame. Missing data is marked unavailable; no synthetic ephemeris is substituted. Playback stops at the valid data-window boundary. Set `HORIZONS_USER_AGENT` to your application's own valid product/version/contact header if adapting or redistributing the service.

SPICE Earth orientation kernels have finite predictive coverage. The service checks daily for a current [NAIF Earth kernel](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/) and regenerates cached Earth orientations after an update. If network refresh fails and orientation falls outside available coverage, the app reports it unavailable.

## Credits

- JPL Horizons ephemerides and NAIF kernels: NASA / Jet Propulsion Laboratory / Caltech. Kernel names, timestamps, and per-body ephemeris solutions are preserved in the data service/cache.
- Planet, Sun, Moon, Earth night/cloud, and Saturn-ring maps: [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Maps are based on NASA imagery, with artistic processing and reconstructed gaps. GPU textures are resized for memory/performance.
- Other moon maps and normal maps: [Celestia Content](https://github.com/CelestiaProject/CelestiaContent), pinned to the commit recorded in `celestia-revision.txt`. See `CELESTIA-README`, `CELESTIA-LICENSE.md`, `CELESTIA-REUSE.toml`, and the `.license` sidecars for individual authors, imagery sources, and licenses. Asset URLs and attribution are recorded in `assets/credits.json`.
- Renderer: Three.js r160, MIT license. Python astronomy bindings: SpiceyPy 8.2.0.

This is an educational live ephemeris viewer. “Live” means the simulation clock follows current UTC and evaluates the loaded astronomical models, not a live camera feed or guaranteed exact measurement.

## Deploy to Vercel

Import this repository with its root as the project root. The included `vercel.json` selects **Other**, runs `python3 build_static.py`, and serves the generated `public/` directory. Remove old custom framework, build-command, or output-directory overrides if the project already has them.

HTML, JavaScript, CSS, maps, and textures are served as static files. The deep-space view works independently of the astronomy API. `api/index.py` exposes the Python astronomy API, initializes SPICE on demand, and writes caches and refreshed Earth kernels to temporary storage. Planet/moon data loads progressively through one request per body; it does not require an always-running background process. Successful responses are cached at Vercel's edge for one hour, within the ephemeris validity window. No secrets or API keys are required by the default setup.

The original local-only server was not a Vercel function and wrote into the project directory. Those assumptions caused deployment incompatibility; the explicit static build and serverless adapter address them. A deployed instance can be checked at `/api/health`; it should report `ok: true` and `delivery: "per-body"`.

Checks: `python3 -m unittest discover -s tests -p 'test_*.py'` (with requirements installed), `node --test tests/*.cjs`, and `python3 build_static.py`. Runtime tests use actual Three.js geometry/math with a mocked renderer; actual browser rendering and frame rate should also be checked on the target device.

## Deep Space Observatory

Choose **Space ↗** from the Solar System header or open `/space.html`. Four scales cover the Milky Way, nearby confirmed exoplanet systems, selected galaxies, and observed black holes. This is a catalog explorer and scientific reconstruction. It cannot show distant objects at their unobservable present instant: light takes years to millions of years to reach us. Its UTC clock is current; its astrometry and telescope images are dated observations.

- **Milky Way:** a reconstructed barred spiral, using an adopted approximate 100,000-light-year disk diameter and 26,000-light-year Sun-to-center distance. The model's 12,000 phone / 32,000 desktop points illustrate stellar density; they are not a catalog of individually measured stars. Its orientation and arms are approximate. Solar System and Sagittarius A* hotspots connect to the other observatories.
- **Nearby systems:** 320 host stars and 534 confirmed planets within 30 parsecs in the bundled NASA Exoplanet Archive PSCompPars snapshot. All host markers use actual catalog RA, declination and distance. The frame is ICRS-aligned: +X at RA 0°, +Y north, -Z at RA 90°. Distances stay proportional (3 pc per scene unit). This is a subset of confirmed planet hosts, not every nearby star. No proper-motion extrapolation to current UTC is claimed.
- **Planet diagrams:** source orbital period, semimajor axis, radius, mass/estimate and discovery method remain available. Missing values say unavailable. Guide circles illustrate semimajor axes with compressed spacing; eccentric orbit geometry, orientation and phase are not reconstructed. Planet colors and angular layout are illustrative, not surface observations or present-day measured positions. Missing semimajor axes get no invented orbit.
- **Galaxies:** Andromeda, Triangulum, M81, M82, M87 and the Large/Small Magellanic Clouds use SIMBAD catalog coordinates and rounded distances from linked NASA sources. Marker spacing is radially compressed, while directions are retained. Shapes, disk orientations, sizes and individual render points are illustrative. The Andromeda panel links a recorded Hubble observation of part of its disk.
- **Black holes:** Sagittarius A* and M87* have sourced mass/distance estimates and real EHT observation panels with dates and credits. The 3D disk/lens ring is an illustration, not a general-relativistic ray trace or current observation. Optional gas animation is explicitly illustrative and disabled by default. The horizon-radius reference uses a nonrotating Schwarzschild assumption, not a measured shadow radius or known spin.

`assets/space/nearby.json` preserves the NASA TAP query and retrieval timestamp. Run `python3 fetch_space_catalog.py` to refresh the bounded archive snapshot; it requires Requests and internet. `assets/space/catalog.json` preserves the raw CDS SIMBAD coordinate response, source links, approximate-distance flags, telescope image dates and full image credits. Catalogs are bundled static snapshots; they are not automatically refreshed on each page visit.

Recorded images load lazily from official ESO/ESA/Hubble CDNs and retain visible credits beside them. EHT images: EHT Collaboration, [ESO image usage, CC BY 4.0](https://www.eso.org/public/outreach/copyright/). Andromeda: NASA, ESA, J. Dalcanton (University of Washington, USA), B. F. Williams (University of Washington, USA), L. C. Johnson (University of Washington, USA), the PHAT team, and R. Gendler; [ESA/Hubble image usage, CC BY 4.0](https://esahubble.org/copyright/). They remain accessible through their official observation links if an image fails to load.

The page works independently of the Horizons API. Phones use a 1.25 pixel-ratio cap, fewer reconstruction particles, bounded point batches and a 30-fps rendering cap. Hidden tabs suspend drawing, disposed layers release geometry/materials, and reduced-motion settings suppress illustrative animation. Target search, selectors and touch controls provide keyboard and phone navigation. Run `node --test tests/test_space.cjs` for catalog-coordinate, diagram, source-state, focus, resource and runtime checks with real Three.js geometry/math and a mocked renderer.
