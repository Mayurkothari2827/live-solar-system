"""Read-only bounded production API probe; stores metadata, never substituted states."""
import concurrent.futures, datetime, json, math, time, requests, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='https://live-solar-system.vercel.app'
def get(url):
    response=requests.get(url,timeout=(15,55));response.raise_for_status();return response.json()
def probe(body):
    began=time.monotonic();result={'id':body['id'],'name':body['name']}
    try:
        record=get(BASE+'/api/ephemeris?id='+str(body['id']));rows=record.get('samples',[]);now=time.time()
        valid=record.get('id')==body['id'] and record.get('start',math.inf)<=now<record.get('end',-math.inf) and len(rows)>1
        valid=valid and all(len(row)==7 and all(isinstance(x,(float,int)) and math.isfinite(x) and not isinstance(x,bool) for x in row) and (not i or row[0]>rows[i-1][0]) for i,row in enumerate(rows))
        valid=valid and rows[0][0]<=record['start'] and rows[-1][0]>=record['end']
        rotations=record.get('orientations',[])
        if rotations:
            rotation_valid=all(len(q)==4 and all(isinstance(x,(int,float)) and math.isfinite(x) and not isinstance(x,bool) for x in q) for q in rotations)
            norm_error=max(abs(sum(x*x for x in q)-1) for q in rotations) if rotation_valid else None
            rotation_valid=rotation_valid and norm_error<1e-5 and record.get('orientationStep',0)>0 and record.get('orientationStart',math.inf)<=record['start'] and record['orientationStart']+(len(rotations)-1)*record['orientationStep']>=record['end']
            valid=valid and rotation_valid
            result.update(orientations=len(rotations),maxQuaternionNormError=norm_error,rotationCoverageValid=rotation_valid)
        else:result['orientations']='UNAVAILABLE — not substituted'
        result.update(status='VERIFIED' if valid else 'FAILED',source=record.get('source'),samples=len(rows),start=record.get('start'),end=record.get('end'))
    except Exception as error:result.update(status='FAILED',error=str(error))
    result['seconds']=round(time.monotonic()-began,3);return result
if __name__=='__main__':
    catalog=get(BASE+'/api/catalog');bodies=catalog['bodies']
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(probe,bodies))
    report={'checkedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'backend':BASE,'catalogBodies':len(bodies),'results':results,'scope':'HTTP state-sample identity, finiteness, monotonicity, coverage, current-UTC validity and available quaternion normalization/coverage; not independent astrometric ground truth or hardware performance.'}
    (ROOT/'qa/live-api-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'verified':sum(r['status']=='VERIFIED' for r in results),'failed':[r for r in results if r['status']=='FAILED']}))

    sys.exit(0 if all(r["status"]=="VERIFIED" for r in results) else 1)
