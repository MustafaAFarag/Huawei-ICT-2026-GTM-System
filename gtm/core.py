import csv
import hashlib
import io
import json
import re
import sqlite3
import uuid
from functools import wraps
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHANNELS = ('email', 'linkedin', 'call', 'whatsapp')

def now():
    return datetime.now(timezone.utc).isoformat()

def uid(*parts):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, '|'.join(map(str, parts))))

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def tokens(text):
    return set(re.findall(r'[\w]+', text.casefold()))

class Conflict(ValueError):
    pass

def serialized(fn):
    @wraps(fn)
    def call(self,*args,**kwargs):
        self.db.execute('BEGIN IMMEDIATE')
        try:
            result=fn(self,*args,**kwargs)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise
    return call

class Store:
    def __init__(self, path=':memory:'):
        self.db = sqlite3.connect(path, timeout=20)
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS workspace(id TEXT PRIMARY KEY, name TEXT, brand TEXT);
        CREATE TABLE IF NOT EXISTS offer(id TEXT, workspace TEXT REFERENCES workspace(id), data TEXT, PRIMARY KEY(workspace,id));
        CREATE TABLE IF NOT EXISTS campaign(id TEXT, workspace TEXT REFERENCES workspace(id), data TEXT, PRIMARY KEY(workspace,id));
        CREATE TABLE IF NOT EXISTS contact(id TEXT, workspace TEXT REFERENCES workspace(id), data TEXT, PRIMARY KEY(workspace,id));
        CREATE TABLE IF NOT EXISTS enrollment(id TEXT, workspace TEXT REFERENCES workspace(id), campaign TEXT, contact TEXT, data TEXT, PRIMARY KEY(workspace,id), UNIQUE(workspace,campaign,contact));
        CREATE TABLE IF NOT EXISTS import_row(id TEXT, workspace TEXT REFERENCES workspace(id), campaign TEXT, batch TEXT, row_number INTEGER, data TEXT, PRIMARY KEY(workspace,id));
        CREATE TABLE IF NOT EXISTS action(id TEXT, workspace TEXT REFERENCES workspace(id), campaign TEXT, contact TEXT, channel TEXT, state TEXT, due TEXT, data TEXT, PRIMARY KEY(workspace,id));
        CREATE TABLE IF NOT EXISTS event(id TEXT, workspace TEXT REFERENCES workspace(id), contact TEXT, data TEXT, PRIMARY KEY(workspace,id));
        CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, workspace TEXT, data TEXT);
        CREATE TABLE IF NOT EXISTS asset(id TEXT, workspace TEXT REFERENCES workspace(id), campaign TEXT, data TEXT, PRIMARY KEY(workspace,id));
        ''')

    def close(self):
        self.db.close()

    def workspace(self, w):
        row = self.db.execute('SELECT * FROM workspace WHERE id=?', (w,)).fetchone()
        if not row:
            raise ValueError('Client workspace does not exist.')
        return dict(row) | {'brand': json.loads(row['brand'])}

    def get(self, table, w, id):
        if table not in ('offer','campaign','contact','enrollment','action','event','asset','import_row'):
            raise ValueError('Invalid record type.')
        row = self.db.execute(f'SELECT * FROM {table} WHERE workspace=? AND id=?', (w,id)).fetchone()
        if not row:
            raise ValueError('Record does not exist in this client workspace.')
        return {k:v for k,v in dict(row).items() if k!='data'} | json.loads(row['data'])

    def rows(self, table, w):
        if table not in ('offer','campaign','contact','enrollment','action','event','asset','import_row','audit'):
            raise ValueError('Invalid record type.')
        return [{k:v for k,v in dict(r).items() if k!='data'} | json.loads(r['data']) for r in self.db.execute(f'SELECT * FROM {table} WHERE workspace=? ORDER BY rowid', (w,))]

    def put(self, table, w, id, data, **columns):
        names = ['id','workspace','data',*columns]
        payload={k:v for k,v in data.items() if k not in ('data','workspace','id') and k not in columns}
        values = [id,w,json.dumps(payload,ensure_ascii=False),*columns.values()]
        self.db.execute(f'INSERT INTO {table} ({",".join(names)}) VALUES ({",".join("?" for _ in names)}) ON CONFLICT(workspace,id) DO UPDATE SET '+','.join(f'{n}=excluded.{n}' for n in names if n not in ('id','workspace')), values)

    def log(self, w, kind, **data):
        self.db.execute('INSERT INTO audit VALUES (?,?,?)', (str(uuid.uuid4()),w,json.dumps({'kind':kind,'at':now(),**data},ensure_ascii=False)))

    def seed(self):
        if self.db.execute('SELECT 1 FROM workspace LIMIT 1').fetchone():
            return
        fixture = json.loads((ROOT/'fixtures/demo.json').read_text())
        with self.db:
            for w in fixture['workspaces']:
                self.db.execute('INSERT INTO workspace VALUES (?,?,?)',(w['id'],w['name'],json.dumps(w['brand'])))
                for offer in fixture['offers']:
                    self.put('offer',w['id'],offer['id'],offer)
                for c in w['campaigns']:
                    self.put('campaign',w['id'],c['id'],{'name':c['name'],'version':1,'sender_ready':c['sender_ready'],'sender_reason':c.get('sender_reason',''),'created_at':now(),'simulated':True})
        for w in fixture['workspaces']:
            for c in w['campaigns']:
                self.import_leads(w['id'],c['id'],c['rows'],batch='demo-'+c['id'])

    @serialized
    def create_campaign(self,w,name):
        self.workspace(w)
        if not name.strip():
            raise ValueError('Give the campaign a name.')
        id = str(uuid.uuid4())
        with self.db:
            self.put('campaign',w,id,{'name':name.strip(),'version':1,'sender_ready':False,'sender_reason':'Sender has not been reviewed.','created_at':now(),'simulated':True})
        return id

    @serialized
    def save_offer(self,w,offer):
        self.workspace(w)
        required=('id','name','name_ar')
        if any(not isinstance(offer.get(k),str) or not offer[k].strip() for k in required):
            raise ValueError('Offer ID, English name and Arabic name are required.')
        if not re.fullmatch(r'[a-z0-9_-]{1,60}',offer['id']): raise ValueError('Use a short lowercase offer identifier.')
        for key in ('terms','role_terms'):
            if not isinstance(offer.get(key),list) or not offer[key] or any(not isinstance(t,str) or not t.strip() for t in offer[key]):
                raise ValueError('Offer and role terms must be nonempty lists of words.')
        if not offer.get('reviewer','').strip(): raise ValueError('An offer reviewer is required.')
        saved={k:offer[k] for k in ('id','name','name_ar','terms','role_terms','reviewer')}
        saved.update(approved_claims=[],reviewed_at=now())
        with self.db:
            self.put('offer',w,offer['id'],saved)
            for c in self.rows('contact',w): self.invalidate_contact(w,c['id'],'Client offering changed.')
            self.log(w,'offer_updated',offer=offer['id'],reviewer=offer['reviewer'])
        return saved

    @serialized
    def save_brand(self,w,brand):
        self.workspace(w)
        required=('name','navy','gold','profile_name','profile_role','profile_url','direction')
        if any(not isinstance(brand.get(k),str) or not brand[k].strip() for k in required): raise ValueError('Complete every brand and profile field.')
        if any(not re.fullmatch(r'#[0-9a-fA-F]{6}',brand[k]) for k in ('navy','gold')): raise ValueError('Brand colors must be six-digit hex values.')
        from urllib.parse import urlparse
        parsed=urlparse(brand['profile_url'])
        if parsed.scheme!='https' or not parsed.netloc or len(brand['profile_url'].encode())>78: raise ValueError('Profile URL must use HTTPS and be at most 78 UTF-8 bytes for the QR.')
        saved={k:brand[k] for k in required}
        with self.db:
            self.db.execute('UPDATE workspace SET brand=? WHERE id=?',(json.dumps(saved,ensure_ascii=False),w))
            self.log(w,'brand_updated')
        return saved

    def rank(self,w,contact):
        evidence = [e for e in contact.get('evidence',[]) if e.get('approved') and not e.get('conflict')]
        ranked = []
        for offer in self.rows('offer',w):
            role = tokens(contact.get('role',''))
            role_fit = bool(role & set(offer['role_terms']))
            from .retrieval import retrieve
            matches = retrieve(' '.join(offer['terms']),evidence,k=5)
            score = int(bool(matches)) + int(bool(matches) and role_fit)
            ranked.append({'offer_id':offer['id'],'name':offer['name'],'name_ar':offer['name_ar'],'score':score,'evidence_ids':[e['id'] for e in matches],'role_fit':role_fit,'reason':('Evidence and role support this offer.' if score==2 else 'Offer is a hypothesis; role or evidence needs review.'),'method':'transparent-rules-v1'})
        return sorted(ranked,key=lambda o:(-o['score'],o['offer_id']))

    @staticmethod
    def import_flag(raw,key):
        value=raw.get(key,False)
        if isinstance(value,bool): return value
        if isinstance(value,str):
            value=value.strip().casefold()
            if value in ('true','yes','1'): return True
            if value in ('false','no','0',''): return False
        raise ValueError(f'{key} must be true or false.')

    @staticmethod
    def sequence_copies(contact,drafts,language):
        first=drafts[language]
        followup=(f"Hello {contact['name']}, would it be helpful to revisit the proposal below?\n\n" if language=='en' else 'مرحباً، هل يناسبكم الرجوع إلى المقترح التالي؟\n\n')+first
        return [first,followup,followup]

    @staticmethod
    def parse_evidence(raw):
        evidence=raw.get('evidence') or []
        if isinstance(evidence,str):
            try: evidence=json.loads(evidence)
            except json.JSONDecodeError: raise ValueError('Evidence must be a JSON array.')
        if not isinstance(evidence,list) or any(not isinstance(e,dict) or not all(isinstance(e.get(k),str) and e[k].strip() for k in ('id','text','source','date')) for e in evidence):
            raise ValueError('Evidence needs id, text, source and date for every entry.')
        if len({e['id'] for e in evidence})!=len(evidence): raise ValueError('Evidence IDs must be unique within each contact.')
        for e in evidence:
            try: datetime.fromisoformat(e['date'])
            except ValueError: raise ValueError('Evidence dates must use ISO format.')
        return [e | {'approved':False,'conflict':e.get('conflict') in (True,'true','1')} for e in evidence]

    @serialized
    def import_leads(self,w,cid,rows,batch=None):
        self.get('campaign',w,cid)
        if not isinstance(rows,list) or len(rows)>5000:
            raise ValueError('Import a list of at most 5,000 rows.')
        batch = batch or digest(rows)
        outcomes=[]
        with self.db:
            for index,raw in enumerate(rows,1):
                rowid = uid(w,cid,batch,index)
                prior = self.db.execute('SELECT data FROM import_row WHERE workspace=? AND id=?',(w,rowid)).fetchone()
                if prior:
                    previous=json.loads(prior['data'])
                    if previous['raw'] != raw:
                        raise Conflict('This import ID already contains different rows. Use a new import ID.')
                    outcomes.append(previous | {'retried':True})
                    continue
                outcome={'source_row_id':str(raw.get('source_row_id') or index) if isinstance(raw,dict) else str(index),'raw':raw,'at':now()}
                if not isinstance(raw,dict) or any(not isinstance(raw.get(k),str) or not raw[k].strip() for k in ('name','company')):
                    outcome.update(status='rejected',reason='Name and company are required.')
                else:
                    try:
                        incoming_evidence=self.parse_evidence(raw)
                        incoming_optout=self.import_flag(raw,'opt_out')
                        incoming_client=self.import_flag(raw,'existing_client')
                    except ValueError as error:
                        outcome.update(status='rejected',reason=str(error))
                        self.put('import_row',w,rowid,outcome,campaign=cid,batch=batch,row_number=index)
                        outcomes.append(outcome)
                        continue
                    clean={k:str(raw.get(k,'')).strip() for k in ('name','company','role','email','linkedin','phone')}
                    clean['email']=clean['email'].casefold()
                    clean['linkedin']=clean['linkedin'].rstrip('/').casefold()
                    if clean['email'] and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',clean['email']):
                        outcome.update(status='rejected',reason='Email format is invalid.')
                    elif not any(clean[k] for k in ('email','linkedin','phone')):
                        outcome.update(status='rejected',reason='An email, LinkedIn URL or phone is required for identity.')
                    else:
                        # Match ANY available professional identifier, not just the preferred one.
                        candidates=[c for c in self.rows('contact',w) if any(clean[k] and clean[k]==c.get(k) for k in ('email','linkedin','phone'))]
                        if len(candidates)>1:
                            outcome.update(status='review',reason='Identifiers match different contacts; resolve identity before enrollment.')
                        else:
                            existing=candidates[0] if candidates else None
                            identity=next(clean[k] for k in ('email','linkedin','phone') if clean[k])
                            contactid=existing['id'] if existing else uid(w,identity)
                            if existing:
                                before=digest(existing)
                                for k,v in clean.items():
                                    if v and existing.get(k) and v != existing[k]:
                                        existing['identity_conflict']=True
                                    if v and not existing.get(k):
                                        existing[k]=v
                                known={e['id']:e for e in existing['evidence']}
                                for incoming in incoming_evidence:
                                    old=known.get(incoming['id'])
                                    if old is None: existing['evidence'].append(incoming)
                                    elif any(old.get(k)!=incoming.get(k) for k in ('text','source','date')):
                                        old.update(conflict=True,approved=False,conflicting_import=incoming)
                                existing['opt_out']=existing.get('opt_out',False) or incoming_optout
                                existing['existing_client']=existing.get('existing_client',False) or incoming_client
                                self.put('contact',w,contactid,existing)
                                if digest(existing)!=before: self.invalidate_contact(w,contactid,'Imported evidence changed.')
                                contact=existing
                            else:
                                evidence=incoming_evidence
                                contact=clean | {'evidence':evidence,'opt_out':incoming_optout,'existing_client':incoming_client,'simulated':True,'origin':raw.get('origin','imported-unverified'),'created_at':now()}
                                self.put('contact',w,contactid,contact)
                            eid=uid(w,cid,contactid)
                            enrolled=self.db.execute('SELECT 1 FROM enrollment WHERE workspace=? AND id=?',(w,eid)).fetchone()
                            if not enrolled:
                                self.put('enrollment',w,eid,{'source_row_ids':[outcome['source_row_id']],'drafts':{},'approval':None,'copy_version':1,'created_at':now()},campaign=cid,contact=contactid)
                            else:
                                en=self.get('enrollment',w,eid)
                                en['source_row_ids']=sorted(set(en['source_row_ids']+[outcome['source_row_id']]))
                                self.put('enrollment',w,eid,en,campaign=cid,contact=contactid)
                            outcome.update(status='duplicate' if enrolled else 'imported',contact_id=contactid,enrollment_id=eid,reason='Reconciled with existing enrollment.' if enrolled else 'Imported for review.')
                            if contact['opt_out'] or contact['existing_client']:
                                self.db.execute("UPDATE action SET state='cancelled' WHERE workspace=? AND contact=? AND state='scheduled'",(w,contactid))
                self.put('import_row',w,rowid,outcome,campaign=cid,batch=batch,row_number=index)
                outcomes.append(outcome)
            self.log(w,'import',campaign=cid,batch=batch,outcomes=len(outcomes))
        return outcomes

    @serialized
    def review_evidence(self,w,contactid,evidenceid,approved,reviewer):
        if not isinstance(approved,bool): raise ValueError('Evidence decision must be true or false.')
        if not reviewer.strip(): raise ValueError('Reviewer name is required.')
        c=self.get('contact',w,contactid)
        e=next((e for e in c['evidence'] if e['id']==evidenceid),None)
        if not e: raise ValueError('Evidence was not found.')
        if approved and e.get('conflict'): raise Conflict('Conflicting evidence must remain on hold.')
        if e.get('approved')==bool(approved) and e.get('reviewed_at'): return
        e.update(approved=bool(approved),reviewer=reviewer,reviewed_at=now())
        with self.db:
            self.put('contact',w,contactid,c)
            self.invalidate_contact(w,contactid,'Evidence review changed.')
            self.log(w,'evidence_review',contact=contactid,evidence=evidenceid,approved=approved,reviewer=reviewer)

    def invalidate_contact(self,w,contactid,reason):
        for en in self.rows('enrollment',w):
            if en['contact']==contactid:
                en['approval']=None
                self.put('enrollment',w,en['id'],en,campaign=en['campaign'],contact=contactid)
        self.db.execute("UPDATE action SET state='cancelled' WHERE workspace=? AND contact=? AND state='scheduled'",(w,contactid))

    def copy_hash(self,w,en):
        c=self.get('contact',w,en['contact'])
        campaign=self.get('campaign',w,en['campaign'])
        return digest({'drafts':en['drafts'],'sequence':{lang:self.sequence_copies(c,en['drafts'],lang) for lang in en['drafts']},'copy_version':en['copy_version'],'campaign_version':campaign['version'],'evidence':c['evidence'],'rank':self.rank(w,c),'identity':{k:c.get(k) for k in ('role','name','company','email','linkedin','phone')}})

    @serialized
    def draft(self,w,eid):
        en=self.get('enrollment',w,eid)
        c=self.get('contact',w,en['contact'])
        ranked=self.rank(w,c)
        top=ranked[0]
        supported=top['score']==2
        ev=next((e for e in c['evidence'] if e['id'] in top['evidence_ids']),None)
        fact=ev['text'] if ev else 'There is no reviewed company evidence yet.'
        offer=self.get('offer',w,top['offer_id'])
        en['drafts']={
            'en':f"Hello {c['name']},\n\nOur reviewed brief for {c['company']} says: {fact}\n\nWould it be useful to explore {offer['name'].lower()} with the appropriate owner? This is a hypothesis for discussion, not an assumption about your internal needs.\n\nLara",
            'ar':f"مرحباً {c['name']}،\n\nيتضمن ملخصنا المُراجع عن {c['company']} المعلومة التالية: {fact}\n\nهل يناسبكم بحث إمكانية التعاون في {offer['name_ar']} مع المسؤول المختص؟ هذا مقترح للنقاش، وليس افتراضاً بشأن احتياجاتكم الداخلية.\n\nلارا"}
        en.update(approval=None,offer_id=top['offer_id'],evidence_ids=top['evidence_ids'],copy_version=en['copy_version']+1,supported=supported,claims_reviewed=False,drafting_method='grounded-template-v1')
        with self.db:
            self.put('enrollment',w,eid,en,campaign=en['campaign'],contact=en['contact'])
            self.db.execute("UPDATE action SET state='cancelled' WHERE workspace=? AND campaign=? AND contact=? AND state='scheduled'",(w,en['campaign'],en['contact']))
            self.log(w,'draft_generated',enrollment=eid,method='grounded-template-v1')
        return en

    @serialized
    def edit(self,w,eid,drafts,version):
        en=self.get('enrollment',w,eid)
        if version != en['copy_version']: raise Conflict('Copy changed since you opened it. Reload before saving.')
        if set(drafts)!= {'en','ar'} or any(not isinstance(t,str) or not t.strip() or len(t)>4000 for t in drafts.values()):
            raise ValueError('Provide nonempty English and Arabic drafts, each at most 4,000 characters.')
        en.update(drafts=drafts,copy_version=version+1,approval=None,claims_reviewed=False)
        with self.db:
            self.put('enrollment',w,eid,en,campaign=en['campaign'],contact=en['contact'])
            self.db.execute("UPDATE action SET state='cancelled' WHERE workspace=? AND campaign=? AND contact=? AND state='scheduled'",(w,en['campaign'],en['contact']))
            self.log(w,'copy_changed',enrollment=eid,version=en['copy_version'])
        return en

    def holds(self,w,en,channel=None):
        c=self.get('contact',w,en['contact'])
        holds=[]
        if c['opt_out']: holds.append('Contact opted out.')
        if c['existing_client']: holds.append('Existing client is excluded.')
        if c.get('identity_conflict'): holds.append('Professional identifiers conflict.')
        if c.get('replied'): holds.append('Contact replied; later touches are cancelled.')
        if any(e.get('conflict') for e in c['evidence']): holds.append('Company evidence conflicts.')
        if not en['drafts']: holds.append('Generate and review the bilingual draft.')
        if not en.get('offer_id') or next((o['score'] for o in self.rank(w,c) if o['offer_id']==en.get('offer_id')),0)<2: holds.append('Offer needs reviewed evidence and a supported recipient role.')
        if en.get('drafts') and not en.get('claims_reviewed'): holds.append('A reviewer must check factual claims in the copy.')
        if channel:
            field={'email':'email','linkedin':'linkedin','call':'phone','whatsapp':'phone'}[channel]
            if not c.get(field): holds.append(f'Missing {field} blocks {channel}.')
            if channel=='linkedin' and any(len(t)>1900 for t in en['drafts'].values()): holds.append('LinkedIn copy exceeds the demo custom-field limit of 1,900 characters.')
            if channel=='email':
                campaign=self.get('campaign',w,en['campaign'])
                if not campaign['sender_ready']: holds.append('Sender readiness: '+campaign['sender_reason'])
        return holds

    @serialized
    def approve(self,w,eid,reviewer,version,claims_reviewed):
        en=self.get('enrollment',w,eid)
        if version!=en['copy_version']: raise Conflict('Copy version changed; review the current version.')
        if not reviewer.strip() or claims_reviewed is not True: raise ValueError('Name a reviewer and confirm factual claims were checked.')
        en['claims_reviewed']=True
        h=self.holds(w,en)
        if h: raise Conflict('Approval blocked: '+' '.join(h))
        en['approval']={'reviewer':reviewer,'at':now(),'hash':self.copy_hash(w,en),'copy_version':version,'claims_reviewed':True}
        with self.db:
            self.put('enrollment',w,eid,en,campaign=en['campaign'],contact=en['contact'])
            self.log(w,'copy_approved',enrollment=eid,reviewer=reviewer,version=version)
        return en

    def approved(self,w,en):
        return bool(en['approval'] and en['approval']['hash']==self.copy_hash(w,en))

    @serialized
    def sender(self,w,cid,ready,reason):
        if not isinstance(ready,bool): raise ValueError('Sender readiness must be true or false.')
        c=self.get('campaign',w,cid)
        c.update(sender_ready=bool(ready),sender_reason=reason or 'Sender review is incomplete.')
        with self.db:
            self.put('campaign',w,cid,c)
            if not ready:
                self.db.execute("UPDATE action SET state='cancelled' WHERE workspace=? AND campaign=? AND channel='email' AND state='scheduled'",(w,cid))
            self.log(w,'sender_readiness',campaign=cid,ready=bool(ready),reason=c['sender_reason'])

    @serialized
    def prepare(self,w,cid,channel,language='en'):
        if channel not in CHANNELS or language not in ('en','ar'): raise ValueError('Choose a supported channel and language.')
        campaign=self.get('campaign',w,cid)
        outcomes=[]
        with self.db:
            for en in self.rows('enrollment',w):
                if en['campaign']!=cid: continue
                h=self.holds(w,en,channel)
                if not self.approved(w,en): h.append('Current copy has no valid approval.')
                collision=self.db.execute("SELECT 1 FROM action WHERE workspace=? AND contact=? AND campaign!=? AND state='scheduled' LIMIT 1",(w,en['contact'],cid)).fetchone()
                if collision: h.append('Contact has scheduled touches in another campaign.')
                if not h:
                    for step in (1,2,3):
                        aid=uid(w,cid,en['contact'],channel,en['copy_version'],language,step)
                        prior=self.db.execute('SELECT state FROM action WHERE workspace=? AND id=?',(w,aid)).fetchone()
                        if prior and prior['state'] in ('cancelled','failed'):
                            h.append('A previous fixture touch is cancelled or failed. Regenerate and review a new copy version before preparing again.')
                            break
                state='blocked' if h else 'prepared'
                ids=[]
                if not h:
                    for step,day in enumerate((0,3,7),1):
                        aid=uid(w,cid,en['contact'],channel,en['copy_version'],language,step)
                        ids.append(aid)
                        prior=self.db.execute('SELECT 1 FROM action WHERE workspace=? AND id=?',(w,aid)).fetchone()
                        if not prior:
                            body=self.sequence_copies(self.get('contact',w,en['contact']),en['drafts'],language)[step-1]
                            self.put('action',w,aid,{'step':step,'copy':body,'language':language,'copy_version':en['copy_version'],'approval_hash':en['approval']['hash'],'simulated':True,'external_id':None,'kind':'manual-task' if channel in ('call','whatsapp') else 'provider-fixture','created_at':now()},campaign=cid,contact=en['contact'],channel=channel,state='scheduled',due=(datetime.now(timezone.utc)+timedelta(days=day)).isoformat())
                outcomes.append({'enrollment_id':en['id'],'contact_id':en['contact'],'status':state,'reasons':h,'action_ids':ids})
            self.log(w,'channel_prepared',campaign=cid,channel=channel,simulated=True)
        return {'campaign':cid,'channel':channel,'language':language,'simulated':True,'outcomes':outcomes,'live_execution':False}

    @serialized
    def event(self,w,eventid,contactid,kind,external_id=None):
        if not eventid or kind not in ('reply','opt_out','sent','failed'): raise ValueError('Event ID and supported event kind are required.')
        self.get('contact',w,contactid)
        prior=self.db.execute('SELECT data FROM event WHERE workspace=? AND id=?',(w,eventid)).fetchone()
        data={'contact':contactid,'kind':kind,'external_id':external_id,'simulated':True}
        if prior:
            old=self.get('event',w,eventid)
            if any(old[k]!=v for k,v in data.items()): raise Conflict('Event ID already refers to different content.')
            return old | {'duplicate':True}
        with self.db:
            if kind in ('reply','opt_out'):
                c=self.get('contact',w,contactid)
                c['replied' if kind=='reply' else 'opt_out']=True
                self.put('contact',w,contactid,c)
                self.invalidate_contact(w,contactid,kind)
            else:
                if not external_id: raise ValueError('Sent and failed fixtures must identify an action.')
                a=self.get('action',w,external_id)
                if a['contact']!=contactid: raise Conflict('Action belongs to another contact.')
                if a['state']!='scheduled': raise Conflict('Only a scheduled fixture action can transition.')
                self.db.execute('UPDATE action SET state=? WHERE workspace=? AND id=?',('sent' if kind=='sent' else 'failed',w,external_id))
            data['at']=now()
            self.put('event',w,eventid,data,contact=contactid)
            self.log(w,'provider_event',event_kind=kind,**{k:v for k,v in data.items() if k!='kind'})
        return data | {'duplicate':False}

    def dashboard(self,w):
        workspace=self.workspace(w)
        campaigns=self.rows('campaign',w)
        contacts={c['id']:c for c in self.rows('contact',w)}
        ens=[]
        for en in self.rows('enrollment',w):
            ens.append(en | {'contact_record':contacts[en['contact']],'sequence_preview':{lang:self.sequence_copies(contacts[en['contact']],en['drafts'],lang) for lang in en['drafts']},'ranking':self.rank(w,contacts[en['contact']]),'holds':self.holds(w,en),'approved':self.approved(w,en),'channels':{ch:self.holds(w,en,ch) for ch in CHANNELS}})
        return {'workspace':workspace,'campaigns':campaigns,'offers':self.rows('offer',w),'enrollments':ens,'imports':self.rows('import_row',w),'actions':self.rows('action',w),'events':self.rows('event',w),'assets':self.rows('asset',w),'audit':self.rows('audit',w),'mode':'Local demonstration · synthetic evidence · simulated execution','ai':{'ranking':'transparent-rules-v1','drafting':'grounded-template-v1','model_evaluation':'Not run: independent labels and pretrained weights are unavailable.'}}

    def export_rows(self,w,cid,channel,language='en'):
        result=self.prepare(w,cid,channel,language)
        rows=[]
        for outcome in result['outcomes']:
            en=self.get('enrollment',w,outcome['enrollment_id'])
            c=self.get('contact',w,en['contact'])
            row={'source_row_ids':';'.join(en['source_row_ids']),'contact_id':en['contact'],'name':c['name'],'company':c['company'],'email':c['email'],'linkedin_url':c['linkedin'],'phone':c['phone'],'status':outcome['status'],'reasons':'; '.join(outcome['reasons']),'message_1':'','message_2':'','message_3':'','copy_version':en['copy_version'],'simulated':True}
            if outcome['status']=='prepared':
                for i,aid in enumerate(outcome['action_ids'],1): row[f'message_{i}']=self.get('action',w,aid)['copy']
            rows.append(row)
        return rows

    def provider_payload(self,w,cid,language='en'):
        rows=self.export_rows(w,cid,'email',language)
        return {'provider':'smartlead','mode':'fixture','paused':True,'campaign_name':self.get('campaign',w,cid)['name'],'lead_list':[{'email':r['email'],'first_name':r['name'],'company_name':r['company'],'custom_fields':{f'message_{i}':r[f'message_{i}'] for i in (1,2,3)},'source_contact_id':r['contact_id']} for r in rows if r['status']=='prepared'],'reconciliation':rows,'note':'Preparation contract only. No live API request is made.'}
