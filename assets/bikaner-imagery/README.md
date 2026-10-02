# Bikaner satellite imagery

Actual optical imagery of Bikaner from the **EOxCloudless 2025** Sentinel-2 annual mosaic. This is recorded imagery, not a live camera or a 3D scan. Native detail is approximately **10 metres per pixel**.

Required visible credit wherever this imagery is displayed:

**[EOxCloudless](https://cloudless.eox.at) by [EOX IT Services GmbH](https://eox.at) (Contains modified Copernicus Sentinel data 2025)**

Imagery is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), for non-commercial use with attribution and ShareAlike. It has its own license, separate from the application source. See `CC-BY-NC-SA-4.0.txt` and the [provider’s license](https://cloudless.eox.at/license-non-commercial). EOX explicitly allows use of its public WMS endpoints and stitched requests up to 4096 pixels. Commercial use requires a separate EOX license.

## Files

| File | Bounds (west, south, east, north) | Dimensions | Ground coverage |
|---|---|---|---|
| `city-2025.jpg` | 73.2925, 28.0004, 73.3435, 28.0454 | 1024 × 1024 | Approximately 5 × 5 km |
| `region-2025.jpg` | 73.15, 27.8745, 73.486, 28.1713 | 2048 × 2048 | Approximately 33 × 33 km |

Both images are north-up equirectangular crops in EPSG:4326. The city image is resampled to approximately 4.9 metres per output pixel, without adding detail beyond the source’s 10 metre resolution. The surrounding image is downsampled to approximately 16 metres per pixel. These JPEGs are unmodified WMS responses; no synthetic or AI-generated geography has been added.

`metadata.json` records the exact requests, geographic extents, SHA-256 hashes, resolution, and attribution. For a plane whose x-axis points east and z-axis points south, map the image’s upper-left corner to the northwest corner.
