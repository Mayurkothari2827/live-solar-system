"""Read-only pinned upstream sidecar check; records evidence without assuming rights."""
import concurrent.futures,json,requests
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
entries={v['original']:v for v in json.loads((ROOT/'assets/optimized/credits.json').read_text()).values()}
missing={k:v for k,v in entries.items() if 'Celestia' in v.get('source','') and not (ROOT/'assets'/f'{k}.license').exists()}
def inspect(item):
 name,data=item;url=data['source']+'.license'
 try:
  r=requests.get(url,timeout=(15,30));return dict(original=name,url=url,httpStatus=r.status_code,metadata=r.text if r.status_code==200 else None)
 except Exception as e:return dict(original=name,url=url,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:result=list(pool.map(inspect,missing.items()))
(ROOT/'qa/upstream-license-results.json').write_text(json.dumps(result,indent=2)+'\n')
print([(r['original'],r.get('httpStatus'),bool(r.get('metadata'))) for r in result])
