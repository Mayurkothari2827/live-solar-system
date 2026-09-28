"""Vercel entry point. Static pages are served directly by the CDN."""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

os.environ['SOLAR_SERVERLESS']='1'
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed=urlparse(self.path)
        query=parse_qs(parsed.query)
        route=query.get('route',[parsed.path.removeprefix('/api/').strip('/')])[0]
        cache='no-store'
        try:
            server.initialize_spice()
            if route=='catalog':
                payload=server.catalog();cache='public, max-age=300, s-maxage=3600'
            elif route=='ephemeris':
                try:code=int(query.get('id',[''])[0])
                except (ValueError,TypeError):return self.respond({'error':'A valid body ID is required'},400)
                if code not in server.BODY_LOCKS:return self.respond({'error':'Unknown body ID'},400)
                payload=server.body_ephemeris(code)
                cache='public, max-age=300, s-maxage=3600'
            elif route=='health':
                payload={'ok':True,'delivery':'per-body','bodies':len(server.BODIES),'utc':server.iso(server.time.time())}
            else:return self.respond({'error':'Unknown API route'},404)
        except Exception as error:
            print('Solar API failure:',type(error).__name__,str(error)[:400],flush=True)
            return self.respond({'error':'Astronomy data is temporarily unavailable. Please retry shortly.'},503)
        return self.respond(payload,200,cache)

    def respond(self,payload,status,cache='no-store'):
        raw=json.dumps(payload,separators=(',',':'),allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control',cache)
        self.send_header('Content-Length',str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
