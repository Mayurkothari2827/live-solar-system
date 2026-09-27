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
