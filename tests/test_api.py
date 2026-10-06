"""Exercise real HTTP request handlers in memory; no socket required."""
import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from gtm.server import Handler
from gtm.core import Store

class Request(Handler):
    def __init__(self,path,body,database,headers=None):
        self.path=path;self.server=SimpleNamespace(database=database,server_port=8765)
        raw=json.dumps(body).encode() if body is not None else b''
        self.headers={'Host':'127.0.0.1:8765','Content-Type':'application/json','Content-Length':str(len(raw)),**(headers or {})}
        self.rfile=io.BytesIO(raw);self.result=None
        self.dispatch(body is not None)
    def send(self,code,body,kind='application/json; charset=utf-8',download=None):self.result=(code,body,kind,download)

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=str(Path(self.tmp.name)/'db.sqlite');s=Store(self.path);s.seed();s.close()
    def tearDown(self):self.tmp.cleanup()
    def call(self,path,body=None,headers=None):return Request(path,body,self.path,headers).result
    def test_board_and_workspaces(self):
        result=self.call('/api/board?workspace=advisory');self.assertEqual(result[0],200);self.assertEqual(len(result[1]['campaigns']),2)
        self.assertEqual(len(self.call('/api/workspaces')[1]),2)
    def test_reject_foreign_origin_and_host(self):
        body={'workspace':'advisory','name':'New'}
        self.assertEqual(self.call('/api/campaign',body,{'Origin':'https://other.example'})[0],403)
        self.assertEqual(self.call('/api/board',None,{'Host':'other.example'})[0],403)
        self.assertEqual(self.call('/api/campaign',body,{'Content-Type':'text/plain'})[0],415)
    def test_csv_mapping_and_empty_import(self):
        result=self.call('/api/import',{'workspace':'advisory','campaign':'launch','csv':'Full Name,Account,Email\nDemo Example,Demo Co,demo@example.org\n','mapping':{'Full Name':'name','Account':'company','Email':'email'}})
        self.assertEqual(result[0],200);self.assertEqual(result[1]['outcomes'][0]['status'],'imported')
        self.assertEqual(self.call('/api/import',{'workspace':'advisory','campaign':'launch','csv':''})[0],400)
    def test_exports_and_assets(self):
        for format in ('csv','xlsx','smartlead'):
            result=self.call('/api/export',{'workspace':'advisory','campaign':'launch','channel':'email','format':format});self.assertEqual(result[0],200);self.assertIsNotNone(result[3])
        result=self.call('/api/asset',{'workspace':'advisory','campaign':'launch','kind':'card','language':'ar'});self.assertEqual(result[0],201)
        assetid=result[1]['id'];self.assertEqual(self.call('/asset/'+assetid+'?workspace=advisory')[0],200)
        self.assertEqual(self.call('/asset/'+assetid+'?workspace=studio')[0],400)
    def test_end_to_end_review_and_reply(self):
        board=self.call('/api/board?workspace=advisory')[1];en=board['enrollments'][0]
        def body(**values):return {'workspace':'advisory',**values}
        self.assertEqual(self.call('/api/evidence',body(contact=en['contact'],evidence=en['contact_record']['evidence'][0]['id'],approved=True,reviewer='Test'))[0],200)
        drafted=self.call('/api/draft',body(enrollment=en['id']))[1]
        self.assertEqual(self.call('/api/approve',body(enrollment=en['id'],reviewer='Test',version=drafted['copy_version'],claims_reviewed=True))[0],200)
        self.assertEqual(self.call('/api/prepare',body(campaign='launch',channel='email'))[0],200)
        self.assertEqual(self.call('/api/event',body(id='test-reply',contact=en['contact'],kind='reply'))[0],200)
        board=self.call('/api/board?workspace=advisory')[1]
        self.assertEqual(sum(a['state']=='cancelled' for a in board['actions']),3)
    def test_unknown_paths_and_invalid_requests(self):
        self.assertEqual(self.call('/api/missing')[0],404)
        self.assertEqual(self.call('/api/board?workspace=other')[0],400)
        self.assertEqual(self.call('/api/draft',{'workspace':'advisory'})[0],400)

if __name__=='__main__':unittest.main()
