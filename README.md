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

Close-up and moon-system views preserve physical body radii, flattening/triaxial radii, and inter-body distances. The solar overview always preserves relative orbital distances; its optional visibility setting enlarges rendered bodies and is explicitly labeled. Camera position is freely chosen, not an Earth-based observing location.

Trajectories are the loaded 48-hour ephemeris, not invented full circular orbits. Body labels and enlarged overview sizes are visual aids. Lighting direction follows the Sun. Eclipse shading approximates spherical occulters and the Sun's angular extent; this is not a precision eclipse-contact calculator. Atmosphere rendering, ocean reflectance, exposure adaptation, and the decorative star field are visual approximations. Saturn's rings cast/receive simplified shading; not all faint planetary rings are modeled.

Surface maps and Earth clouds/night lights are static reference imagery. They are not today's live weather or current storm positions. Map alignment, unobserved terrain, and image processing limit surface realism independently of positional accuracy.

## Data service

Horizons requests are serialized and cached. The server checks hourly and refreshes only when the current window is near its end. The browser checks the local cache every five minutes and does not call NASA for each frame. Missing data is marked unavailable; no synthetic ephemeris is substituted. Playback stops at the valid data-window boundary. Set `HORIZONS_USER_AGENT` to your application's own valid product/version/contact header if adapting or redistributing the service.

SPICE Earth orientation kernels have finite predictive coverage. The service checks daily for a current [NAIF Earth kernel](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/) and regenerates cached Earth orientations after an update. If network refresh fails and orientation falls outside available coverage, the app reports it unavailable.

## Credits

- JPL Horizons ephemerides and NAIF kernels: NASA / Jet Propulsion Laboratory / Caltech. Kernel names, timestamps, and per-body ephemeris solutions are preserved in the data service/cache.
- Planet, Sun, Moon, Earth night/cloud, and Saturn-ring maps: [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Maps are based on NASA imagery, with artistic processing and reconstructed gaps. GPU textures are resized for memory/performance.
- Other moon maps and normal maps: [Celestia Content](https://github.com/CelestiaProject/CelestiaContent), pinned to the commit recorded in `celestia-revision.txt`. See `CELESTIA-README`, `CELESTIA-LICENSE.md`, `CELESTIA-REUSE.toml`, and the `.license` sidecars for individual authors, imagery sources, and licenses. Asset URLs and attribution are recorded in `assets/credits.json`.
- Renderer: Three.js r160, MIT license. Python astronomy bindings: SpiceyPy 8.2.0.

This is an educational live ephemeris viewer. “Live” means the simulation clock follows current UTC and evaluates the loaded astronomical models, not a live camera feed or guaranteed exact measurement.

## Bikaner City Observatory

Choose **Bikaner city** in the solar-system header, or open `/city.html`. The view covers roughly 5 × 5 km centered on Junagarh Fort. It combines 38,801 real building footprints from Overture Maps with 3,562 OpenStreetMap road segments, 60 mapped areas, and 18 landmarks. The Overture release is 2026-09-23.1 and combines OSM, Microsoft, and Google Open Buildings sources. The bundled geometry does not require a map API key. Source metadata, dates, attribution, and bounds are preserved in `assets/bikaner.json` and `assets/bikaner-buildings.json`. If the larger dataset is unavailable, the original 1,948 OSM footprints remain a fallback.

Only real mapped building footprints are extruded. This extract has no measured building heights and only one mapped floor count; other heights, façade textures, rooftop tanks, fort wall details, trees within mapped parks, street lamps, and flat terrain are illustrative. This is an interactive geographic reconstruction, not a photogrammetric digital twin or live street-camera view. Geometry is © OpenStreetMap contributors and [Overture Maps data contributors](https://docs.overturemaps.org/attribution/#buildings), ODbL. Microsoft and Google footprints were inferred from aerial imagery; their geometry can contain recognition errors.

Current conditions and a 12-hour forecast come directly from the [Open-Meteo forecast API](https://open-meteo.com/en/docs), CC BY 4.0. The page requests Bikaner's fixed coordinates (no device location permission) and refreshes every 10 minutes. Current conditions are weather-model estimates. Temperature, humidity, cloud cover, precipitation, visibility, wind speed, and wind direction drive the display. Solar lighting follows an approximate astronomical calculation for Bikaner's current time; sunrise/sunset times come from the API. Cloud structures and precipitation particles illustrate the supplied conditions, not tracked individual clouds or drops. All displayed times are Asia/Kolkata.

The last successful weather response is retained in browser storage for up to 24 hours and is marked cached/stale on a failed refresh or if its model timestamp is older than two hours. An outage without saved data shows unavailable values. Golden-hour, rain, and night previews are explicitly separate from live weather and never replace the live numerical readings. Reduced-motion preferences stop rain movement, cloud drift, and automatic camera motion. The free Open-Meteo endpoint is intended for non-commercial use; use their appropriate subscription endpoint when adapting this for commercial use.

Actual satellite ground imagery comes from [EOxCloudless 2025 by EOX IT Services GmbH](https://cloudless.eox.at/), containing modified Copernicus Sentinel data 2025. The central 5 km crop and 33 km surrounding crop are aligned to WGS84 coordinates. Native spatial detail is 10 m; resampling does not add detail. This is a recorded annual mosaic. The imagery is [CC BY-NC-SA 4.0](https://cloudless.eox.at/license-non-commercial), so these bundled imagery assets support non-commercial use. Full license, bounds, exact WMS requests, and checksums are in `assets/bikaner-imagery/`.

Wall, concrete roof, and asphalt maps are scanned [Poly Haven](https://polyhaven.com/) surfaces, CC0; normal and roughness maps give them physical lighting response. They are generic materials, not photographs of individual buildings. Sources, authors, dimensions, and checksums are in `assets/city-materials/credits.json`. Building geometry is batched by 500 m spatial cells for view culling and bounded construction memory.

Camera controls: drag to orbit, shift-drag (or right-drag) to pan, scroll or pinch to zoom. **Walk the streets** switches to a 1.72 m eye height; drag to look, use WASD or arrow keys to move, and hold Shift to move faster. Touch direction buttons provide the same controls. Building polygons and the fort perimeter block movement. **Hide panels** opens a clear world view; Escape restores the panels. **Live** in the atmosphere preview returns to current lighting and weather. Lamps and window illumination are illustrative and follow the local night/day state.

## Deploy to Vercel

Import this repository with its root as the project root. The included `vercel.json` selects **Other**, runs `python3 build_static.py`, and serves the generated `public/` directory. Remove old custom framework, build-command, or output-directory overrides if the project already has them.

HTML, JavaScript, CSS, maps, and textures are served as static files. The Bikaner view works independently of the astronomy API. `api/index.py` exposes the Python astronomy API, initializes SPICE on demand, and writes caches and refreshed Earth kernels to temporary storage. Planet/moon data loads progressively through one request per body; it does not require an always-running background process. Successful responses are cached at Vercel's edge for one hour, within the ephemeris validity window. No secrets or API keys are required by the default setup.

The original local-only server was not a Vercel function and wrote into the project directory. Those assumptions caused deployment incompatibility; the explicit static build and serverless adapter address them. A deployed instance can be checked at `/api/health`; it should report `ok: true` and `delivery: "per-body"`.

Checks: `python3 -m unittest discover -s tests -p 'test_*.py'` (with requirements installed), `node tests/test_city.cjs`, and `python3 build_static.py`. Runtime tests mock WebGL; actual browser rendering should also be checked on the target device.
