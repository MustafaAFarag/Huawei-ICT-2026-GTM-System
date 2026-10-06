"""Local-only review server. No auth or outward provider calls; bind loopback."""
import argparse
import csv
import io
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from .core import ROOT, Store, Conflict
from .assets import generate
from .exports import csv_bytes, xlsx_bytes

class Handler(BaseHTTPRequestHandler):
    def send(self,code,body,kind='application/json; charset=utf-8',download=None):
        if isinstance(body,(dict,list)): body=json.dumps(body,ensure_ascii=False).encode()
        elif isinstance(body,str): body=body.encode()
        self.send_response(code)
        self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(body)))
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-store')
        self.send_header('Referrer-Policy','no-referrer')
        if download: self.send_header('Content-Disposition',f'attachment; filename="{download}"')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self): self.dispatch(False)
    def do_POST(self): self.dispatch(True)

    def dispatch(self,post):
        store=Store(self.server.database)
        try:
            parsed=urlparse(self.path)
            q=parse_qs(parsed.query)
            host=self.headers.get('Host','')
            allowed={f'localhost:{self.server.server_port}',f'127.0.0.1:{self.server.server_port}'}
            if host not in allowed: return self.send(403,{'error':'Use the local review address.'})
            if post:
                if self.headers.get('Origin') not in (None,*['http://'+h for h in allowed]):
                    return self.send(403,{'error':'This action must originate from the local review page.'})
                if not self.headers.get('Content-Type','').startswith('application/json'):
                    return self.send(415,{'error':'Use application/json for campaign actions.'})
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<=4_000_000: raise ValueError('Request must be between 1 byte and 4 MB.')
                body=json.loads(self.rfile.read(size))
                w=body.get('workspace','')
            else:
                body={}
                w=q.get('workspace',['advisory'])[0]
            path=parsed.path
            if path=='/api/workspaces' and not post:
                return self.send(200,[{'id':r['id'],'name':r['name']} for r in store.db.execute('SELECT id,name FROM workspace')])
            if path=='/api/board' and not post: return self.send(200,store.dashboard(w))
            if path=='/api/campaign' and post: return self.send(201,{'id':store.create_campaign(w,body['name'])})
            if path=='/api/offer' and post: return self.send(200,store.save_offer(w,body['offer']))
            if path=='/api/brand' and post: return self.send(200,store.save_brand(w,body['brand']))
            if path=='/api/import' and post:
                rows=body.get('rows')
                if rows is None:
                    reader=csv.DictReader(io.StringIO(body.get('csv','')))
                    if not reader.fieldnames: raise ValueError('CSV is empty. Use the import template.')
                    mapping=body.get('mapping',{})
                    rows=[{mapping.get(k,k):v for k,v in r.items() if k} for r in reader]
                return self.send(200,{'outcomes':store.import_leads(w,body['campaign'],rows,body.get('batch'))})
            if path=='/api/evidence' and post:
                store.review_evidence(w,body['contact'],body['evidence'],body['approved'],body['reviewer'])
                return self.send(200,{'saved':True})
            if path=='/api/draft' and post: return self.send(200,store.draft(w,body['enrollment']))
            if path=='/api/edit' and post: return self.send(200,store.edit(w,body['enrollment'],body['drafts'],body['version']))
            if path=='/api/approve' and post: return self.send(200,store.approve(w,body['enrollment'],body['reviewer'],body['version'],body.get('claims_reviewed')))
            if path=='/api/sender' and post:
                store.sender(w,body['campaign'],body['ready'],body.get('reason',''))
                return self.send(200,{'saved':True})
            if path=='/api/prepare' and post: return self.send(200,store.prepare(w,body['campaign'],body['channel'],body.get('language','en')))
            if path=='/api/event' and post: return self.send(200,store.event(w,body['id'],body['contact'],body['kind'],body.get('external_id')))
            if path=='/api/asset' and post:
                return self.send(201,{'id':generate(store,w,body['campaign'],body['kind'],body.get('language','en'),body.get('enrollment'))})
            if path.startswith('/asset/') and not post:
                asset=store.get('asset',w,path.split('/')[-1])
                return self.send(200,asset['html'],'text/html; charset=utf-8','campaign-asset.html' if q.get('download') else None)
            if path=='/api/export' and post:
                channel=body.get('channel','email')
                fmt=body.get('format','csv')
                lang=body.get('language','en')
                if fmt=='smartlead': return self.send(200,store.provider_payload(w,body['campaign'],lang),'application/json','smartlead-fixture.json')
                rows=store.export_rows(w,body['campaign'],channel,lang)
                if fmt=='csv': return self.send(200,csv_bytes(rows),'text/csv; charset=utf-8',f'{channel}-preparation.csv')
                if fmt=='xlsx': return self.send(200,xlsx_bytes(rows),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',f'{channel}-preparation.xlsx')
                raise ValueError('Choose CSV, XLSX, or Smartlead fixture.')
            if path=='/api/ledger' and not post:
                cid=q.get('campaign',[''])[0]
                store.get('campaign',w,cid)
                rows=[{'source_row_id':r['source_row_id'],'row_number':r['row_number'],'batch':r['batch'],'status':r['status'],'reason':r['reason'],'contact_id':r.get('contact_id','')} for r in store.rows('import_row',w) if r['campaign']==cid]
                return self.send(200,csv_bytes(rows),'text/csv; charset=utf-8','import-reconciliation.csv')
            if path.startswith('/api/'): return self.send(404,{'error':'Campaign operation was not found.'})
            static={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css'}
            if path not in static: return self.send(404,'Page was not found.','text/plain')
            file=ROOT/'web'/static[path]
            return self.send(200,file.read_bytes(),mimetypes.guess_type(file)[0]+'; charset=utf-8')
        except Conflict as error: self.send(409,{'error':str(error)})
        except (ValueError,KeyError,TypeError,json.JSONDecodeError) as error: self.send(400,{'error':str(error) if isinstance(error,ValueError) else 'The request is missing required fields.'})
        except Exception:
            import traceback
            traceback.print_exc()
            self.send(500,{'error':'The operation failed. Reload and try again; the local server log has details.'})
        finally: store.close()

    def log_message(self,format,*args):
        pass

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8765)
    parser.add_argument('--db',default=str(ROOT/'data'/'command-center.sqlite'))
    args=parser.parse_args()
    from pathlib import Path
    Path(args.db).parent.mkdir(parents=True,exist_ok=True)
    store=Store(args.db); store.seed(); store.close()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    server.database=args.db
    print(f'GTM Command Center: http://127.0.0.1:{args.port} — local synthetic demo',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=='__main__': main()
