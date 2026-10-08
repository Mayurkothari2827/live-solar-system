"""Refresh the sourced, bounded deep-space catalogue; no generated object coordinates."""
from pathlib import Path
from datetime import datetime, timezone
import json, requests
ROOT=Path(__file__).resolve().parent
QUERY='select pl_name,hostname,ra,dec,sy_dist,pl_orbper,pl_orbsmax,pl_orbeccen,pl_rade,pl_bmasse,st_teff,st_rad,st_mass,discoverymethod,disc_year from pscomppars where sy_dist > 0 and sy_dist <= 30 order by sy_dist,hostname,pl_name'
r=requests.get('https://exoplanetarchive.ipac.caltech.edu/TAP/sync',params={'query':QUERY,'format':'json'},timeout=90);r.raise_for_status();planets=r.json()
assert isinstance(planets,list) and len(planets)>10
hosts={}
for p in planets:
    if p['ra'] is None or p['dec'] is None:continue
    h=hosts.setdefault(p['hostname'],{'id':p['hostname'],'name':p['hostname'],'type':'star','raDeg':p['ra'],'decDeg':p['dec'],'distancePc':p['sy_dist'],'temperatureK':p['st_teff'],'radiusSolar':p['st_rad'],'massSolar':p['st_mass'],'planets':[],'source':'https://exoplanetarchive.ipac.caltech.edu/','positionNote':'Catalog astrometry; no present-epoch proper-motion extrapolation.'})
    h['planets'].append({k:v for k,v in p.items() if k not in ['hostname','ra','dec','sy_dist','st_teff','st_rad','st_mass']})
data={'retrievedUTC':datetime.now(timezone.utc).isoformat(),'query':QUERY,'source':'https://exoplanetarchive.ipac.caltech.edu/TAP/sync','definition':'https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html','maxDistancePc':30,'hosts':list(hosts.values())}
(ROOT/'assets/space/nearby.json').write_text(json.dumps(data,indent=2)+'\n')
print(len(hosts),'observed exoplanet host systems;',sum(len(h['planets']) for h in hosts.values()),'confirmed planets',flush=True)
