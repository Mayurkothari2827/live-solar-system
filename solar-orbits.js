/* Instantaneous two-body osculating orbit guides, in the input state frame.
 * These curves describe the current orbit geometry; they are not a substitute
 * for the JPL ephemeris or a long-term, multi-body position prediction.
 * Sun GM: JPL DE440, https://ssd.jpl.nasa.gov/astro_par.html
 * 1.32712440041279419e20 m^3/s^2 = 132712440041.279419 km^3/s^2.
 * AU: IAU 2012 exact definition, 149597870.7 km.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SolarOrbitGuides = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict';
  const SUN_GM = 132712440041.279419;
  const AU_KM = 149597870.7;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const length = a => Math.hypot(a[0], a[1], a[2]);
  const scale = (a, n) => [a[0] * n, a[1] * n, a[2] * n];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vector = a => a != null && a.length === 3 && Number.isFinite(a[0]) && Number.isFinite(a[1]) && Number.isFinite(a[2]);

  /**
   * r: heliocentric position in km; v: heliocentric velocity in km/s.
   * Any orthonormal frame is supported, including the scene's [x,z,-y].
   * Returns null for invalid, radial or unbound states. The samples + 1 points
   * form a closed ellipse, beginning at the supplied current state.
   */
  function ellipseFromState(r, v, options = {}) {
    if (!vector(r) || !vector(v)) return null;
    if (typeof options === 'number') options = { samples: options };
    options = options || {};
    const mu = options.mu == null ? SUN_GM : options.mu;
    if (!Number.isFinite(mu) || mu <= 0) return null;
    const requested = options.samples == null ? 256 : options.samples;
    if (!Number.isFinite(requested)) return null;
    const samples = Math.max(16, Math.min(4096, Math.floor(requested)));
    const radius = length(r), speed = length(v);
    if (radius <= 0 || speed <= 0 || !Number.isFinite(radius) || !Number.isFinite(speed)) return null;
    const h = cross(r, v), hLength = length(h);
    // A radial trajectory has no stable orbital plane and must not get a
    // made-up circular guide. The relative guard also catches numerical noise.
    if (!Number.isFinite(hLength) || hLength <= radius * speed * 1e-12) return null;
    const inverseA = 2 / radius - dot(v, v) / mu;
    if (!Number.isFinite(inverseA) || inverseA <= 0) return null;
    const a = 1 / inverseA;
    const vxh = cross(v, h);
    const eccentricityVector = [vxh[0] / mu - r[0] / radius, vxh[1] / mu - r[1] / radius, vxh[2] / mu - r[2] / radius];
    let e = length(eccentricityVector);
    if (!Number.isFinite(a) || !Number.isFinite(e) || e >= 1 - 1e-12) return null;
    const normal = scale(h, 1 / hLength);
    // Periapsis is undefined for a circular orbit. Use its current radial
    // direction as an equivalent, stable basis instead of dividing by zero.
    const provisionalDirection = e > 1e-12 ? scale(eccentricityVector, 1 / e) : scale(r, 1 / radius);
    // Enforce the orbital plane numerically: division by a very small
    // eccentricity otherwise amplifies round-off outside the plane.
    const normalComponent = dot(provisionalDirection, normal);
    const planarDirection = [provisionalDirection[0] - normalComponent * normal[0], provisionalDirection[1] - normalComponent * normal[1], provisionalDirection[2] - normalComponent * normal[2]];
    const planarLength = length(planarDirection);
    if (!Number.isFinite(planarLength) || planarLength <= 0) return null;
    const periapsisDirection = scale(planarDirection, 1 / planarLength);
    if (e <= 1e-12) e = 0;
    const transverseDirection = cross(normal, periapsisDirection);
    const b = a * Math.sqrt((1 - e) * (1 + e));
    const currentEccentricAnomaly = Math.atan2(dot(r, transverseDirection) / b, dot(r, periapsisDirection) / a + e);
    const points = [];
    for (let i = 0; i < samples; i++) {
      const anomaly = currentEccentricAnomaly + i * 2 * Math.PI / samples;
      const x = a * (Math.cos(anomaly) - e), y = b * Math.sin(anomaly);
      const point = [
        x * periapsisDirection[0] + y * transverseDirection[0],
        x * periapsisDirection[1] + y * transverseDirection[1],
        x * periapsisDirection[2] + y * transverseDirection[2]
      ];
      if (!vector(point)) return null;
      points.push(point);
    }
    points.push(points[0].slice());
    return { points, a, b, e, periapsis: a * (1 - e), apoapsis: a * (1 + e), normal, periapsisDirection, transverseDirection, currentEccentricAnomaly };
  }

  /** Presentation-only radial compression; do not use for data readouts.
   * Unit is the physical number of km per output unit. Use this exact mapping
   * on both planets and guides so positions remain attached to their orbits.
   * Positive powers are strictly monotonic and retain direction/inclination.
   */
  function compressPosition(position, unit = AU_KM, exponent = 0.46) {
    if (!vector(position) || !Number.isFinite(unit) || unit <= 0 || !Number.isFinite(exponent) || exponent <= 0) return null;
    const radius = length(position);
    if (!Number.isFinite(radius)) return null;
    if (radius === 0) return [0, 0, 0];
    const factor = Math.pow(radius / unit, exponent) / radius;
    const result = scale(position, factor);
    return vector(result) ? result : null;
  }

  return Object.freeze({ SUN_GM, AU_KM, ellipseFromState, compressPosition });
});
