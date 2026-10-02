"""Local, cached JPL Horizons + NAIF/SPICE solar-system viewer."""
from pathlib import Path
import sys, json, time, threading, datetime as dt, re, csv, io, math, os, gzip, tempfile
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT=Path(__file__).resolve().parent
local_libs=ROOT.parents[1]/'work/python-libs'
if local_libs.exists():sys.path.insert(0,str(local_libs))
import numpy as np
import requests
import spiceypy as spice

UTC=dt.timezone.utc
SERVERLESS=os.environ.get('VERCEL')=='1' or os.environ.get('SOLAR_SERVERLESS')=='1'
CACHE=Path(tempfile.gettempdir())/'live-solar-system-cache' if SERVERLESS else ROOT/'cache'
HEADERS={'User-Agent':os.environ.get('HORIZONS_USER_AGENT','Codex/1.0 (+https://openai.com/contact/)')}
API='https://ssd.jpl.nasa.gov/api/horizons.api'
LOCK=threading.RLock(); SPICE_LOCK=threading.Lock(); API_LOCK=threading.Lock(); INIT_LOCK=threading.Lock()
STATUS={'busy':False,'ready':0,'total':29,'message':'Starting','errors':{}}
DATA={}; KERNEL_INFO={}; BODIES=[]; BODY_LOCKS={}

# IDs identify body centers, never substitute planetary-system barycenters.
ROWS=[
 (10,'Sun',0,'G2V star','8k_sun.jpg'),
 (199,'Mercury',10,'Terrestrial planet','8k_mercury.jpg'),
 (299,'Venus',10,'Terrestrial planet','4k_venus_atmosphere.jpg'),
 (399,'Earth',10,'Terrestrial planet','8k_earth_daymap.jpg'),
 (499,'Mars',10,'Terrestrial planet','8k_mars.jpg'),
 (599,'Jupiter',10,'Gas giant','8k_jupiter.jpg'),
 (699,'Saturn',10,'Gas giant','8k_saturn.jpg'),
 (799,'Uranus',10,'Ice giant','2k_uranus.jpg'),
 (899,'Neptune',10,'Ice giant','2k_neptune.jpg'),
 (301,'Moon',399,'Natural satellite','8k_moon.jpg'),
 (401,'Phobos',499,'Natural satellite',None),(402,'Deimos',499,'Natural satellite',None),
 (501,'Io',599,'Natural satellite',None),(502,'Europa',599,'Natural satellite',None),
 (503,'Ganymede',599,'Natural satellite',None),(504,'Callisto',599,'Natural satellite',None),
 (601,'Mimas',699,'Natural satellite',None),(602,'Enceladus',699,'Natural satellite',None),
 (603,'Tethys',699,'Natural satellite',None),(604,'Dione',699,'Natural satellite',None),
 (605,'Rhea',699,'Natural satellite',None),(606,'Titan',699,'Natural satellite',None),
 (607,'Hyperion',699,'Natural satellite',None),(608,'Iapetus',699,'Natural satellite',None),
 (701,'Ariel',799,'Natural satellite',None),(702,'Umbriel',799,'Natural satellite',None),
 (703,'Titania',799,'Natural satellite',None),(704,'Oberon',799,'Natural satellite',None),
 (705,'Miranda',799,'Natural satellite',None),(801,'Triton',899,'Natural satellite',None)
]

def _initialize_spice():
    CACHE.mkdir(parents=True,exist_ok=True)
    for name in ['naif0012.tls','pck00011.tpc','earth_latest_high_prec.bpc','moon_pa_de440_200625.bpc','moon_de440_250416.tf']:
        p=ROOT/'kernels'/name
        if name=='earth_latest_high_prec.bpc' and (CACHE/name).exists():p=CACHE/name
        if p.exists():
            spice.furnsh(str(p));KERNEL_INFO[name]={'bytes':p.stat().st_size,'downloadedUTC':iso(p.stat().st_mtime)}
    maps_path=ROOT/'assets/moon-files.json'
    maps=json.loads(maps_path.read_text()) if maps_path.exists() else {}
    for code,name,parent,kind,texture in ROWS:
        _,radii=spice.bodvrd(name.upper(),'RADII',3)
        frame='ITRF93' if code==399 else 'MOON_ME' if code==301 else 'IAU_'+name.upper()
        rotation_note='IAU body-fixed orientation'
        if code==399:rotation_note='ITRF93 Earth orientation (NAIF high-precision kernel)'
        if code==301:rotation_note='DE440 lunar libration, Moon mean-Earth frame'
        if code in [599,699,799,899]:rotation_note='IAU reference rotation; clouds are not a live weather map'
        if code==10:rotation_note='IAU reference rotation; solar differential rotation is not resolved'
        if code==607:frame=None;rotation_note='Chaotic rotation: reliable instantaneous orientation is unavailable'
        BODIES.append(dict(id=code,name=name,parent=parent,kind=kind,radii=[float(v) for v in radii],radius=float(max(radii)),texture=texture or maps.get(name.lower()),frame=frame,rotationNote=rotation_note))
        BODY_LOCKS[code]=threading.Lock()

def initialize_spice():
    """Initialize once whether imported by Vercel or launched locally."""
    with INIT_LOCK:
        if not BODIES:
            _initialize_spice()
            load_cached()

def iso(seconds):return dt.datetime.fromtimestamp(seconds,UTC).isoformat(timespec='seconds').replace('+00:00','Z')
def cal(seconds):return dt.datetime.fromtimestamp(seconds,UTC).strftime('%Y-%m-%d %H:%M:%S')

def horizons(code,parent,start,end,step='5 m'):
    params={'format':'json','COMMAND':f"'{code}'",'CENTER':f"'500@{parent}'",'MAKE_EPHEM':"'YES'",'OBJ_DATA':"'NO'",'EPHEM_TYPE':"'VECTORS'",'REF_PLANE':"'ECLIPTIC'",'REF_SYSTEM':"'ICRF'",'VEC_CORR':"'NONE'",'VEC_TABLE':"'2'",'CSV_FORMAT':"'YES'",'OUT_UNITS':"'KM-S'",'TIME_TYPE':"'UT'",'TIME_DIGITS':"'FRACSEC'",'START_TIME':f"'{cal(start)}'",'STOP_TIME':f"'{cal(end)}'",'STEP_SIZE':f"'{step}'"}
    with API_LOCK:
        response=requests.get(API,params=params,headers=HEADERS,timeout=(5,30) if SERVERLESS else (20,100))
        response.raise_for_status();payload=response.json()
        if payload.get('signature',{}).get('version') not in {'1.2','1.3'}:raise ValueError('Unexpected Horizons API version; refusing unverified data')
        if payload.get('error'):raise ValueError(payload['error'][:500])
        result=payload.get('result','')
        if '$$SOE' not in result or '$$EOE' not in result:raise ValueError('No Horizons vector table returned')
        rows=[]
        for row in csv.reader(io.StringIO(result.split('$$SOE')[1].split('$$EOE')[0].strip())):
            if len(row)<8:continue
            timestamp=(float(row[0])-2440587.5)*86400
            state=[float(v) for v in row[2:8]]
            if not all(math.isfinite(v) for v in state):raise ValueError('Non-finite ephemeris value')
            rows.append([round(timestamp,4)]+state)
        if len(rows)<2:raise ValueError('Incomplete Horizons response')
        source=re.search(r'Target body name:.*?\{source:\s*([^}]+)',result)
        return {'samples':rows,'source':source.group(1).strip() if source else 'JPL Horizons','fetchedUTC':iso(time.time()),'header':result.split('$$SOE')[0][-2500:]}

def orientations(body,times):
    if not body['frame']:return None
    S=np.array([[1.,0.,0.],[0.,0.,1.],[0.,-1.,0.]])
    values=[]
    with SPICE_LOCK:
        for seconds in times:
            et=spice.str2et(iso(seconds))
            matrix=spice.pxform(body['frame'],'ECLIPJ2000',et)
            q=spice.m2q(S@matrix@S.T)
            values.append([round(float(q[1]),12),round(float(q[2]),12),round(float(q[3]),12),round(float(q[0]),12)])
    return values

def load_cached():
    for body in BODIES:
        p=CACHE/f"{body['id']}.json"
        if p.exists():
            try:
                record=json.loads(p.read_text())
                if record['start']<=time.time()<=record['end']-1800:DATA[str(body['id'])]=record
            except (ValueError,KeyError):pass

def save_record(record):
    # Separate temporary names remain safe when multiple requests finish together.
    with tempfile.NamedTemporaryFile(mode='w',dir=CACHE,suffix='.tmp',delete=False) as file:
        json.dump(record,file,separators=(',',':'),allow_nan=False)
        temporary=Path(file.name)
    temporary.replace(CACHE/f"{record['id']}.json")
    with LOCK:DATA[str(record['id'])]=record

def make_record(body,start,end):
    if body['id']==10:
        record={'samples':[[start+i*300,0,0,0,0,0,0] for i in range(int((end-start)/300)+1)],'source':'Heliocentric origin','fetchedUTC':iso(time.time())}
    else:record=horizons(body['id'],body['parent'],start,end)
    times=[r[0] for r in record['samples']]
    record.update(start=times[0],end=times[-1],id=body['id'],parent=body['parent'])
    record['orientationStart']=times[0];record['orientationStep']=60
    try:
        record['orientations']=orientations(body,np.arange(times[0],times[-1]+.1,60))
        record['orientationError']=None
    except Exception as error:
        record['orientations']=None;record['orientationError']=str(error).splitlines()[-2:]
    return record

def body_ephemeris(code):
    """One bounded request per body: no background jobs or full-system cold start."""
    initialize_spice()
    body=next((b for b in BODIES if b['id']==code),None)
    if body is None:raise ValueError('Unknown body ID')
    with BODY_LOCKS[code]:
        now=time.time();old=DATA.get(str(code))
        if old and old['start']<=now and old['end']>now+10800:return old
        if code==399:refresh_earth_kernel()
        anchor=int(now//21600)*21600
        record=make_record(body,anchor-43200,anchor+129600)
        save_record(record)
        return record

def refresh_all():
    with LOCK:
        if STATUS['busy']:return
        STATUS['busy']=True;STATUS['errors']={}
    now=time.time();anchor=int(now//21600)*21600;start=anchor-43200;end=anchor+129600
    # Favor Earth's close-up and lunar system during an uncached first launch.
    ordered=sorted(BODIES,key=lambda b:([399,301,10,599,501,502,503,504].index(b['id']) if b['id'] in [399,301,10,599,501,502,503,504] else 10+b['id']))
    try:
        for body in ordered:
            key=str(body['id']);old=DATA.get(key)
            if old and old['start']<=now and old['end']>now+10800:continue
            with LOCK:STATUS['message']='Loading '+body['name']
            try:
                record=make_record(body,start,end);save_record(record)
                print('READY',body['name'],record['source'],len(record['samples']),'orientation',bool(record['orientations']),flush=True)
            except Exception as error:
                with LOCK:STATUS['errors'][key]=str(error)[:400]
                print('FAILED',body['name'],str(error)[:400],flush=True)
                # A failure is not filled with synthetic orbit data; reduce demand.
                time.sleep(3)
            with LOCK:STATUS['ready']=len([key for key in DATA if key!='10'])
    finally:
        with LOCK:STATUS['busy']=False;STATUS['message']='Ready' if len(DATA)==len(BODIES) else 'Some bodies unavailable';STATUS['lastRefreshUTC']=iso(time.time())

def monitor():
    while True:
        refresh_earth_kernel()
        refresh_all()
        time.sleep(3600)

def refresh_earth_kernel():
    """Keep Earth orientation predictive coverage current, with daily caching."""
    path=CACHE/'earth_latest_high_prec.bpc' if SERVERLESS else ROOT/'kernels/earth_latest_high_prec.bpc'
    if path.exists() and time.time()-path.stat().st_mtime<86400:return
    loaded=path if path.exists() else ROOT/'kernels/earth_latest_high_prec.bpc'
    try:
        response=requests.get('https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/earth_latest_high_prec.bpc',headers=HEADERS,timeout=(5,10) if SERVERLESS else (20,100));response.raise_for_status()
        if not response.content.startswith(b'DAF/PCK'):raise ValueError('Invalid binary PCK response')
        temporary=path.with_suffix('.new.bpc');temporary.write_bytes(response.content)
        with SPICE_LOCK:
            spice.unload(str(loaded));temporary.replace(path);spice.furnsh(str(path))
        KERNEL_INFO[path.name]={'bytes':path.stat().st_size,'downloadedUTC':iso(time.time())}
        body=next(b for b in BODIES if b['id']==399)
        with LOCK:record=dict(DATA['399']) if '399' in DATA else None
        if record:
            record['orientationStart']=record['start'];record['orientationStep']=60
            record['orientations']=orientations(body,np.arange(record['start'],record['end']+.1,60));record['orientationError']=None
            save_record(record)
    except Exception as error:
        print('Earth kernel refresh unavailable:',str(error)[:180],flush=True)

def catalog():
    return {'bodies':BODIES,'delivery':'per-body' if SERVERLESS else 'local-cache','kernels':KERNEL_INFO,'frame':'Geometric heliocentric ECLIPJ2000; moons relative to parent body center','timeScale':'UTC input converted by Horizons and SPICE','sampleStepSeconds':300,'orientationStepSeconds':60,'interpolation':'Cubic Hermite (positions + velocities); quaternion SLERP (orientation)','moonCount':21}

class Handler(BaseHTTPRequestHandler):
    def log_message(self,format,*args):
        if str(args[1]) not in ['200','304']:super().log_message(format,*args)
    def send_json(self,data,status=200):
        raw=json.dumps(data,separators=(',',':'),allow_nan=False).encode();compressed='gzip' in self.headers.get('Accept-Encoding','')
        if compressed:raw=gzip.compress(raw)
        self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store')
        if compressed:self.send_header('Content-Encoding','gzip')
        self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def do_GET(self):
        path=urlparse(self.path).path
        if path.startswith('/api/'):initialize_spice()
        if path=='/api/catalog':return self.send_json(catalog())
        if path=='/api/status':
            with LOCK:state=dict(STATUS)
            return self.send_json(state)
        if path=='/api/ephemerides':
            with LOCK:payload={'bodies':dict(DATA),'status':dict(STATUS),'serverUTC':iso(time.time())}
            return self.send_json(payload)
        if path=='/api/ephemeris':
            try:return self.send_json(body_ephemeris(int(parse_qs(urlparse(self.path).query).get('id',[''])[0])))
            except (ValueError,TypeError):return self.send_json({'error':'Unknown body ID'},400)
            except Exception:return self.send_json({'error':'JPL data temporarily unavailable; retry shortly.'},503)
        if path=='/api/health':return self.send_json({'ok':True,'utc':iso(time.time()),'ready':len(DATA),'expected':len(BODIES)})
        allowed={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/mobile.js':'mobile.js','/solar-orbits.js':'solar-orbits.js','/style.css':'style.css','/README.md':'README.md','/city':'city.html','/city.html':'city.html','/city.js':'city.js','/city.css':'city.css'}
        if path in allowed:file=ROOT/allowed[path]
        elif path.startswith('/assets/') and '..' not in path:file=ROOT/path.lstrip('/')
        else:return self.send_error(404)
        if not file.is_file():return self.send_error(404)
        import mimetypes
        content=file.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(content)));self.send_header('Cache-Control','no-cache');self.end_headers();self.wfile.write(content)

if __name__=='__main__':
    initialize_spice();STATUS['ready']=len([k for k in DATA if k!='10'])
    if '--prime' in sys.argv:refresh_all();sys.exit(0 if len(DATA)==len(BODIES) else 1)
    threading.Thread(target=monitor,daemon=True).start()
    print('Solar system: http://127.0.0.1:8770/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8770),Handler).serve_forever()
