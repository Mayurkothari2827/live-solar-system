// Serverless JPL Horizons ephemerides proxy for Vercel.
// Fetches position/velocity vectors directly from JPL Horizons API
// and returns them in the same format as the local Python server.

const BODIES = [
  {id:10,name:'Sun',parent:0},
  {id:199,name:'Mercury',parent:10},
  {id:299,name:'Venus',parent:10},
  {id:399,name:'Earth',parent:10},
  {id:499,name:'Mars',parent:10},
  {id:599,name:'Jupiter',parent:10},
  {id:699,name:'Saturn',parent:10},
  {id:799,name:'Uranus',parent:10},
  {id:899,name:'Neptune',parent:10},
  {id:301,name:'Moon',parent:399},
  {id:401,name:'Phobos',parent:499},
  {id:402,name:'Deimos',parent:499},
  {id:501,name:'Io',parent:599},
  {id:502,name:'Europa',parent:599},
  {id:503,name:'Ganymede',parent:599},
  {id:504,name:'Callisto',parent:599},
  {id:601,name:'Mimas',parent:699},
  {id:602,name:'Enceladus',parent:699},
  {id:603,name:'Tethys',parent:699},
  {id:604,name:'Dione',parent:699},
  {id:605,name:'Rhea',parent:699},
  {id:606,name:'Titan',parent:699},
  {id:607,name:'Hyperion',parent:699},
  {id:608,name:'Iapetus',parent:699},
  {id:701,name:'Ariel',parent:799},
  {id:702,name:'Umbriel',parent:799},
  {id:703,name:'Titania',parent:799},
  {id:704,name:'Oberon',parent:799},
  {id:705,name:'Miranda',parent:799},
  {id:801,name:'Triton',parent:899}
];

// IAU rotation parameters for orientation approximation (without SPICE)
// Format: { ra0, raDot, dec0, decDot, w0, wDot } in degrees and degrees/day
// From IAU 2015 report (pck00011.tpc kernel values)
const IAU_ROTATION = {
  10:  {ra0:286.13,raDot:0,dec0:63.87,decDot:0,w0:84.176,wDot:14.1844},
  199: {ra0:281.0103,raDot:-0.0328,dec0:61.4155,decDot:-0.0049,w0:329.5988,wDot:6.1385108},
  299: {ra0:272.76,raDot:0,dec0:67.16,decDot:0,w0:160.20,wDot:-1.4813688},
  399: {ra0:0,raDot:-0.641,dec0:90,decDot:-0.557,w0:190.147,wDot:360.9856235},
  499: {ra0:317.269202,raDot:-0.10927547,dec0:54.432516,decDot:-0.05827105,w0:176.049863,wDot:350.891982443297},
  599: {ra0:268.056595,raDot:-0.006499,dec0:64.495303,decDot:0.002413,w0:284.95,wDot:870.5360000},
  699: {ra0:40.589,raDot:-0.036,dec0:83.537,decDot:-0.004,w0:38.90,wDot:810.7939024},
  799: {ra0:257.311,raDot:0,dec0:-15.175,decDot:0,w0:203.81,wDot:-501.1600928},
  899: {ra0:299.36,raDot:0,dec0:43.46,decDot:0,w0:249.978,wDot:541.1397757},
  301: {ra0:269.9949,raDot:0.0031,dec0:66.5392,decDot:0.0130,w0:38.3213,wDot:13.17635815},
  401: {ra0:317.67071657,raDot:-0.10844326,dec0:52.88627266,decDot:-0.06134706,w0:35.18774440,wDot:1128.84475928},
  402: {ra0:316.65705808,raDot:-0.10518014,dec0:53.50992033,decDot:-0.05979094,w0:79.39932954,wDot:285.16188899},
  501: {ra0:268.05,raDot:-0.009,dec0:64.50,decDot:0.003,w0:200.39,wDot:203.4889538},
  502: {ra0:268.08,raDot:-0.009,dec0:64.51,decDot:0.003,w0:36.022,wDot:101.3747235},
  503: {ra0:268.20,raDot:-0.009,dec0:64.57,decDot:0.003,w0:44.064,wDot:50.3176081},
  504: {ra0:268.72,raDot:-0.009,dec0:64.83,decDot:0.003,w0:259.51,wDot:21.5710715},
  601: {ra0:40.66,raDot:-0.036,dec0:83.52,decDot:-0.004,w0:333.46,wDot:381.9945550},
  602: {ra0:40.66,raDot:-0.036,dec0:83.52,decDot:-0.004,w0:6.32,wDot:262.7318996},
  603: {ra0:40.66,raDot:-0.036,dec0:83.52,decDot:-0.004,w0:8.95,wDot:190.6979085},
  604: {ra0:40.66,raDot:-0.036,dec0:83.52,decDot:-0.004,w0:357.6,wDot:131.5349316},
  605: {ra0:40.38,raDot:-0.036,dec0:83.55,decDot:-0.004,w0:235.16,wDot:79.6900478},
  606: {ra0:39.4827,raDot:0,dec0:83.4279,decDot:0,w0:186.5855,wDot:22.5769768},
  607: {ra0:0,raDot:0,dec0:0,decDot:0,w0:0,wDot:0}, // chaotic
  608: {ra0:318.16,raDot:-3.949,dec0:75.03,decDot:-1.143,w0:355.2,wDot:4.5379572},
  701: {ra0:257.43,raDot:0,dec0:-15.10,decDot:0,w0:156.22,wDot:-142.8356681},
  702: {ra0:257.43,raDot:0,dec0:-15.10,decDot:0,w0:108.05,wDot:-86.8688923},
  703: {ra0:257.43,raDot:0,dec0:-15.10,decDot:0,w0:77.74,wDot:-41.3514316},
  704: {ra0:257.43,raDot:0,dec0:-15.10,decDot:0,w0:6.77,wDot:-26.7394932},
  705: {ra0:257.43,raDot:0,dec0:-15.10,decDot:0,w0:30.70,wDot:-254.6906892},
  801: {ra0:299.36,raDot:0,dec0:41.17,decDot:0,w0:296.53,wDot:-61.2572637}
};

function isoUTC(seconds) {
  return new Date(seconds * 1000).toISOString().replace('.000','').replace('Z','Z');
}

function calUTC(seconds) {
  const d = new Date(seconds * 1000);
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth()+1).padStart(2,'0') + '-' +
    String(d.getUTCDate()).padStart(2,'0') + ' ' +
    String(d.getUTCHours()).padStart(2,'0') + ':' +
    String(d.getUTCMinutes()).padStart(2,'0') + ':' +
    String(d.getUTCSeconds()).padStart(2,'0');
}

// Compute IAU orientation quaternion (ecliptic J2000)
// This approximates SPICE orientation using IAU standard formulae
function computeOrientation(bodyId, epochSeconds) {
  const params = IAU_ROTATION[bodyId];
  if (!params || (params.wDot === 0 && params.ra0 === 0)) return null;
  
  // J2000 epoch: 2000-01-01T12:00:00 TDB
  const J2000 = 946728000; // Unix timestamp of J2000
  const d = (epochSeconds - J2000) / 86400; // days since J2000
  const T = d / 36525; // Julian centuries
  
  const deg2rad = Math.PI / 180;
  
  // Right ascension and declination of north pole (ICRF/J2000 equatorial)
  const ra  = (params.ra0 + params.raDot * T) * deg2rad;
  const dec = (params.dec0 + params.decDot * T) * deg2rad;
  // Prime meridian angle
  const W = (params.w0 + params.wDot * d) * deg2rad;
  
  // Build rotation matrix: body-fixed to ICRF equatorial
  const sinRa = Math.sin(ra), cosRa = Math.cos(ra);
  const sinDec = Math.sin(dec), cosDec = Math.cos(dec);
  const sinW = Math.sin(W), cosW = Math.cos(W);
  
  // M = Rz(-ra) * Rx(-(90-dec)) * Rz(-W)
  // Column 1 of body-to-equatorial matrix
  const m00 = -sinRa*cosW - cosRa*sinDec*sinW;
  const m10 =  cosRa*cosW - sinRa*sinDec*sinW;
  const m20 =  cosDec*sinW;
  
  const m01 =  sinRa*sinW - cosRa*sinDec*cosW;
  const m11 = -cosRa*sinW - sinRa*sinDec*cosW;
  const m21 =  cosDec*cosW;
  
  const m02 =  cosRa*cosDec;
  const m12 =  sinRa*cosDec;
  const m22 =  sinDec;
  
  // Apply obliquity rotation to convert equatorial -> ecliptic J2000
  const eps = 23.4392911 * deg2rad; // J2000 obliquity
  const sinE = Math.sin(eps), cosE = Math.cos(eps);
  
  // Rotate rows 1,2 by obliquity around X-axis: ecliptic = Rx(eps) * equatorial
  const e00 = m00, e01 = m01, e02 = m02;
  const e10 = cosE*m10 + sinE*m20;
  const e11 = cosE*m11 + sinE*m21;
  const e12 = cosE*m12 + sinE*m22;
  const e20 = -sinE*m10 + cosE*m20;
  const e21 = -sinE*m11 + cosE*m21;
  const e22 = -sinE*m12 + cosE*m22;
  
  // Apply the coordinate swap S that server.py uses: S = [[1,0,0],[0,0,1],[0,-1,0]]
  // result = S @ matrix @ S^T where S^T = [[1,0,0],[0,0,-1],[0,1,0]]
  // First compute M' = matrix @ S^T
  const mt00 = e00, mt01 = -e02, mt02 = e01;
  const mt10 = e10, mt11 = -e12, mt12 = e11;
  const mt20 = e20, mt21 = -e22, mt22 = e21;
  
  // Then S @ M'
  const r00 = mt00, r01 = mt01, r02 = mt02;
  const r10 = mt20, r11 = mt21, r12 = mt22;
  const r20 = -mt10, r21 = -mt11, r22 = -mt12;
  
  // Convert rotation matrix to quaternion
  const trace = r00 + r11 + r22;
  let qw, qx, qy, qz;
  
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    qw = 0.25 / s;
    qx = (r21 - r12) * s;
    qy = (r02 - r20) * s;
    qz = (r10 - r01) * s;
  } else if (r00 > r11 && r00 > r22) {
    const s = 2.0 * Math.sqrt(1.0 + r00 - r11 - r22);
    qw = (r21 - r12) / s;
    qx = 0.25 * s;
    qy = (r01 + r10) / s;
    qz = (r02 + r20) / s;
  } else if (r11 > r22) {
    const s = 2.0 * Math.sqrt(1.0 + r11 - r00 - r22);
    qw = (r02 - r20) / s;
    qx = (r01 + r10) / s;
    qy = 0.25 * s;
    qz = (r12 + r21) / s;
  } else {
    const s = 2.0 * Math.sqrt(1.0 + r22 - r00 - r11);
    qw = (r10 - r01) / s;
    qx = (r02 + r20) / s;
    qy = (r12 + r21) / s;
    qz = 0.25 * s;
  }
  
  // Server.py returns [q[1], q[2], q[3], q[0]] from SPICE m2q
  // SPICE quaternion: q[0]=scalar, q[1..3]=vector
  // Return as [x, y, z, w] matching server.py format
  return [
    parseFloat(qx.toFixed(12)),
    parseFloat(qy.toFixed(12)),
    parseFloat(qz.toFixed(12)),
    parseFloat(qw.toFixed(12))
  ];
}

async function fetchHorizons(code, parent, start, end, step) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${code}'`,
    CENTER: `'500@${parent}'`,
    MAKE_EPHEM: "'YES'",
    OBJ_DATA: "'NO'",
    EPHEM_TYPE: "'VECTORS'",
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'",
    VEC_CORR: "'NONE'",
    VEC_TABLE: "'2'",
    CSV_FORMAT: "'YES'",
    OUT_UNITS: "'KM-S'",
    TIME_TYPE: "'UT'",
    TIME_DIGITS: "'FRACSEC'",
    START_TIME: `'${calUTC(start)}'`,
    STOP_TIME: `'${calUTC(end)}'`,
    STEP_SIZE: `'${step}'`
  });

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SolarSystemViewer/1.0' },
    signal: AbortSignal.timeout(90000)
  });

  if (!response.ok) throw new Error(`Horizons HTTP ${response.status}`);
  const payload = await response.json();
  
  if (payload.error) throw new Error(payload.error.slice(0, 500));
  
  const result = payload.result || '';
  if (!result.includes('$$SOE') || !result.includes('$$EOE')) {
    throw new Error('No Horizons vector table returned');
  }

  const rows = [];
  const lines = result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
  for (const line of lines) {
    const fields = line.split(',').map(f => f.trim()).filter(f => f);
    if (fields.length < 8) continue;
    const timestamp = (parseFloat(fields[0]) - 2440587.5) * 86400;
    const state = fields.slice(2, 8).map(Number);
    if (!state.every(Number.isFinite)) throw new Error('Non-finite ephemeris value');
    rows.push([parseFloat(timestamp.toFixed(4)), ...state]);
  }

  if (rows.length < 2) throw new Error('Incomplete Horizons response');

  const sourceMatch = result.match(/Target body name:.*?\{source:\s*([^}]+)/);
  return {
    samples: rows,
    source: sourceMatch ? sourceMatch[1].trim() : 'JPL Horizons',
    fetchedUTC: isoUTC(Date.now() / 1000),
    header: result.split('$$SOE')[0].slice(-2500)
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const now = Date.now() / 1000;
  const anchor = Math.floor(now / 21600) * 21600;
  const start = anchor - 43200;
  const end = anchor + 129600;

  const data = {};
  const errors = {};
  let readyCount = 0;

  // Fetch Earth/Moon/Sun first, then prioritize gas giants
  const ordered = [...BODIES].sort((a, b) => {
    const priority = [399, 301, 10, 599, 501, 502, 503, 504];
    const ai = priority.indexOf(a.id);
    const bi = priority.indexOf(b.id);
    const ap = ai >= 0 ? ai : 10 + a.id;
    const bp = bi >= 0 ? bi : 10 + b.id;
    return ap - bp;
  });

  // Fetch all bodies in parallel (batched to avoid overloading Horizons)
  const BATCH_SIZE = 6;
  for (let i = 0; i < ordered.length; i += BATCH_SIZE) {
    const batch = ordered.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (body) => {
        const key = String(body.id);
        try {
          let record;
          if (body.id === 10) {
            // Sun is at the origin in heliocentric coordinates
            const samples = [];
            for (let t = start; t <= end; t += 300) {
              samples.push([t, 0, 0, 0, 0, 0, 0]);
            }
            record = {
              samples,
              source: 'Heliocentric origin',
              fetchedUTC: isoUTC(now)
            };
          } else {
            record = await fetchHorizons(body.id, body.parent, start, end, '5 m');
          }

          const times = record.samples.map(r => r[0]);
          record.start = times[0];
          record.end = times[times.length - 1];
          record.id = body.id;
          record.parent = body.parent;

          // Compute orientations using IAU rotation parameters
          record.orientationStart = times[0];
          record.orientationStep = 60;
          const orientationTimes = [];
          for (let t = times[0]; t <= times[times.length - 1] + 0.1; t += 60) {
            orientationTimes.push(t);
          }
          
          try {
            if (body.id === 607) {
              // Hyperion has chaotic rotation
              record.orientations = null;
              record.orientationError = ['Chaotic rotation: orientation unavailable'];
            } else {
              const orientations = orientationTimes.map(t => computeOrientation(body.id, t));
              if (orientations[0] !== null) {
                record.orientations = orientations;
                record.orientationError = null;
              } else {
                record.orientations = null;
                record.orientationError = ['IAU rotation parameters unavailable'];
              }
            }
          } catch (err) {
            record.orientations = null;
            record.orientationError = [err.message];
          }

          data[key] = record;
          readyCount++;
        } catch (err) {
          errors[key] = err.message.slice(0, 400);
          console.error(`FAILED ${body.name}:`, err.message.slice(0, 200));
        }
      })
    );
  }

  const payload = {
    bodies: data,
    status: {
      busy: false,
      ready: readyCount,
      total: 30,
      message: readyCount === 30 ? 'Ready' : `${readyCount}/30 bodies loaded`,
      errors,
      lastRefreshUTC: isoUTC(now)
    },
    serverUTC: isoUTC(now)
  };

  res.status(200).json(payload);
};
