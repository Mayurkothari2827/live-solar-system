"""Regression coverage for Vercel import, routing, cache and bounded requests."""
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ['SOLAR_SERVERLESS']='1'
from api.index import handler
import server


class Socket:
    def __init__(self,path):
        self.input=io.BytesIO(f'GET {path} HTTP/1.0\r\nHost: localhost\r\n\r\n'.encode())
        self.output=bytearray()
    def makefile(self,*args,**kwargs):return self.input
    def sendall(self,data):self.output.extend(data)


def get(path):
    socket=Socket(path)
    handler(socket,('127.0.0.1',0),None)
    head,body=bytes(socket.output).split(b'\r\n\r\n',1)
    return int(head.split()[1]),head.decode(),json.loads(body)


class ServerlessTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.cache=patch.object(server,'CACHE',Path(self.directory.name))
        self.cache.start()
        server.DATA.clear()
        server.initialize_spice()
    def tearDown(self):
        self.cache.stop();self.directory.cleanup()

    def test_catalog_import_initializes_once_without_network(self):
        with patch.object(server.requests,'get',side_effect=AssertionError('Unexpected network')):
            code,_,data=get('/api/index?route=catalog')
            self.assertEqual(code,200)
            self.assertEqual(data['delivery'],'per-body')
            self.assertEqual(len(data['bodies']),30)
            get('/api/catalog')
            self.assertEqual(len(server.BODIES),30)

    def test_one_body_request_does_not_fetch_the_entire_system(self):
        def vectors(code,parent,start,end):
            return {'samples':[[start,1,2,3,0,0,0],[end,1,2,3,0,0,0]],'source':'test fixture','fetchedUTC':server.iso(server.time.time())}
        with patch.object(server,'horizons',side_effect=vectors) as fetch:
            status,headers,record=get('/api/index?route=ephemeris&id=199')
            self.assertEqual(status,200)
            self.assertEqual(record['id'],199)
            self.assertEqual(len(record['orientations']),2881)
            self.assertIn('s-maxage=3600',headers)
            self.assertEqual(get('/api/ephemeris?id=199')[0],200)
            self.assertEqual(fetch.call_count,1)
            self.assertEqual(set(server.DATA),{'199'})
            self.assertTrue((server.CACHE/'199.json').is_file())

    def test_invalid_id_never_reaches_horizons(self):
        with patch.object(server,'horizons',side_effect=AssertionError('Unexpected fetch')):
            for query in ['','?id=invalid','?id=123456']:
                self.assertEqual(get('/api/ephemeris'+query)[0],400)

    def test_upstream_failure_is_reported_without_invented_data(self):
        with patch.object(server,'horizons',side_effect=TimeoutError('upstream timeout')):
            status,headers,data=get('/api/ephemeris?id=199')
            self.assertEqual(status,503)
            self.assertIn('no-store',headers)
            self.assertIn('error',data)
            self.assertFalse(server.DATA)

    def test_sun_needs_no_upstream_request(self):
        with patch.object(server.requests,'get',side_effect=AssertionError('Unexpected network')):
            status,_,data=get('/api/ephemeris?id=10')
            self.assertEqual(status,200)
            self.assertEqual(len(data['samples']),577)
            self.assertTrue(all(row[1:]==[0]*6 for row in data['samples']))


if __name__=='__main__':unittest.main()
