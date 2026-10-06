import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from gtm.core import Store, Conflict, ROOT
from gtm.assets import generate
from gtm.exports import csv_bytes, xlsx_bytes
from gtm.qr import qr_matrix
from gtm.retrieval import retrieve, factual_support

class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.s=Store();self.s.seed();self.w='advisory';self.cid='launch'
    def tearDown(self): self.s.close()
    def enrollment(self,name='Noura Ahmed',cid='launch',w='advisory'):
        return next(e for e in self.s.dashboard(w)['enrollments'] if e['contact_record']['name']==name and e['campaign']==cid)
    def ready(self,name='Noura Ahmed',cid='launch',w='advisory'):
        en=self.enrollment(name,cid,w)
        for e in en['contact_record']['evidence']:
            if not e['conflict']: self.s.review_evidence(w,en['contact'],e['id'],True,'Test reviewer')
        en=self.s.draft(w,en['id'])
        return self.s.approve(w,en['id'],'Test reviewer',en['copy_version'],True)
    def test_every_row_recorded(self):
        rows=[r for r in self.s.rows('import_row',self.w) if r['campaign']=='exceptions']
        self.assertEqual(len(rows),8)
        self.assertEqual(sum(r['status']=='duplicate' for r in rows),1)
        self.assertEqual(sum(r['status']=='rejected' for r in rows),1)
    def test_no_duplicate_enrollment(self):
        ens=[e for e in self.s.rows('enrollment',self.w) if e['campaign']=='exceptions']
        self.assertEqual(len(ens),6)
        en=self.enrollment(cid='exceptions')
        self.assertEqual(en['source_row_ids'],['A01','A02'])
    def test_import_retry_and_changed_batch(self):
        data=json.loads((ROOT/'fixtures/demo.json').read_text())['workspaces'][0]['campaigns'][0]['rows']
        result=self.s.import_leads(self.w,'launch',data,batch='demo-launch')
        self.assertTrue(all(r['retried'] for r in result))
        self.assertEqual(len(self.s.rows('import_row',self.w)),10)
        data[0]['name']='Different name'
        with self.assertRaises(Conflict): self.s.import_leads(self.w,'launch',data,batch='demo-launch')
    def test_imported_approval_never_trusted(self):
        en=self.enrollment();self.assertFalse(en['contact_record']['evidence'][0]['approved'])
    def test_bad_evidence_has_row_outcome(self):
        raw={'name':'X','company':'Y','email':'x@example.org','evidence':'not json'}
        result=self.s.import_leads(self.w,'launch',[raw,{'name':'Z','company':'Y','email':'z@example.org'}])
        self.assertEqual([r['status'] for r in result],['rejected','imported'])
    def test_identity_collision_not_auto_merged(self):
        a=self.enrollment()['contact_record'];b=self.enrollment('Maya Karim')['contact_record']
        result=self.s.import_leads(self.w,'launch',[{'name':'X','company':'Y','email':a['email'],'linkedin':b['linkedin']}])
        self.assertEqual(result[0]['status'],'review')
    def test_source_update_becomes_conflict(self):
        self.ready();en=self.enrollment();raw=en['contact_record']
        ev=[dict(e,text='Changed claim') for e in raw['evidence']]
        self.s.import_leads(self.w,'launch',[raw|{'evidence':ev}])
        en=self.enrollment();self.assertFalse(en['approved']);self.assertTrue(en['contact_record']['evidence'][0]['conflict'])
    def test_missing_email_only_blocks_email(self):
        en=self.ready('Hana Youssef','exceptions')
        self.assertTrue(any('Missing email' in h for h in self.s.holds(self.w,en,'email')))
        self.assertFalse(self.s.holds(self.w,en,'linkedin'))
        report=self.s.prepare(self.w,'exceptions','linkedin')
        self.assertEqual(next(o['status'] for o in report['outcomes'] if o['contact_id']==en['contact']),'prepared')
    def test_existing_client_and_optout_excluded(self):
        for name in ('Samir Ali','Dina Hassan'):
            en=self.enrollment(name,'exceptions')
            self.s.review_evidence(self.w,en['contact'],en['contact_record']['evidence'][0]['id'],True,'Test')
            draft=self.s.draft(self.w,en['id'])
            with self.assertRaises(Conflict): self.s.approve(self.w,en['id'],'Test',draft['copy_version'],True)
    def test_conflicting_evidence_cannot_approve(self):
        en=self.enrollment('Omar Saleh','exceptions')
        with self.assertRaises(Conflict): self.s.review_evidence(self.w,en['contact'],en['contact_record']['evidence'][0]['id'],True,'Test')
    def test_title_does_not_substitute_evidence(self):
        en=self.enrollment();rank=en['ranking'];self.assertTrue(all(r['score']==0 for r in rank))
    def test_role_mismatch_needs_review(self):
        en=self.enrollment();c=en['contact_record']
        c['role']='HR assistant';c['evidence'][0]['approved']=True
        self.assertEqual(next(r['score'] for r in self.s.rank(self.w,c) if r['offer_id']=='operations'),1)
    def test_template_has_grounded_hypothesis(self):
        en=self.ready();self.assertIn('hypothesis',en['drafts']['en']);self.assertIn('مقترح للنقاش',en['drafts']['ar'])
    def test_requires_claim_review(self):
        en=self.enrollment();draft=self.s.draft(self.w,en['id'])
        with self.assertRaises(ValueError): self.s.approve(self.w,en['id'],'Test',draft['copy_version'],False)
    def test_edit_invalidates_approval_and_actions(self):
        self.ready();self.s.prepare(self.w,'launch','email');en=self.enrollment()
        self.s.edit(self.w,en['id'],{'en':en['drafts']['en']+' Revised.','ar':en['drafts']['ar']},en['copy_version'])
        self.assertFalse(self.enrollment()['approved']);self.assertTrue(all(a['state']=='cancelled' for a in self.s.rows('action',self.w)))
    def test_stale_version_rejected(self):
        en=self.ready()
        with self.assertRaises(Conflict): self.s.edit(self.w,en['id'],en['drafts'],en['copy_version']-1)
    def test_evidence_change_invalidates_approval(self):
        en=self.ready();c=self.s.get('contact',self.w,en['contact'])
        self.s.review_evidence(self.w,en['contact'],c['evidence'][0]['id'],False,'Test')
        self.assertFalse(self.enrollment()['approved'])
    def test_prepare_retry_is_idempotent(self):
        self.ready();first=self.s.prepare(self.w,'launch','email');second=self.s.prepare(self.w,'launch','email')
        self.assertEqual(first['outcomes'],second['outcomes']);self.assertEqual(len(self.s.rows('action',self.w)),3)
    def test_workspace_scoped_reply(self):
        a=self.ready();self.ready(w='studio',cid='studio-launch')
        self.s.prepare('studio','studio-launch','email');self.s.prepare(self.w,'launch','email')
        first=self.s.event(self.w,'reply-1',a['contact'],'reply');second=self.s.event(self.w,'reply-1',a['contact'],'reply')
        self.assertFalse(first['duplicate']);self.assertTrue(second['duplicate'])
        self.assertTrue(all(a['state']=='cancelled' for a in self.s.rows('action',self.w)))
        self.assertTrue(all(a['state']=='scheduled' for a in self.s.rows('action','studio')))
        self.assertFalse(self.enrollment()['approved'])
    def test_changed_event_id_rejected(self):
        en=self.ready();self.s.event(self.w,'ev',en['contact'],'reply')
        with self.assertRaises(Conflict): self.s.event(self.w,'ev',en['contact'],'opt_out')
    def test_cross_workspace_record_access_fails(self):
        en=self.enrollment()
        with self.assertRaises(ValueError): self.s.get('contact','studio',en['contact'])
        with self.assertRaises(ValueError): self.s.event('studio','ev',en['contact'],'reply')
    def test_campaign_collision(self):
        self.ready();self.ready(cid='exceptions');self.s.prepare(self.w,'launch','email')
        result=self.s.prepare(self.w,'exceptions','linkedin')
        outcome=next(o for o in result['outcomes'] if o['contact_id']==self.enrollment()['contact'])
        self.assertEqual(outcome['status'],'blocked');self.assertTrue(any('another campaign' in h for h in outcome['reasons']))
    def test_sender_hold(self):
        en=self.ready();self.s.prepare(self.w,'launch','email');self.s.sender(self.w,'launch',False,'Review domain')
        self.assertTrue(all(a['state']=='cancelled' for a in self.s.rows('action',self.w)))
        self.assertTrue(any('Sender readiness' in h for h in self.s.holds(self.w,en,'email')))
    def test_provider_fixture_and_blocked_exports(self):
        self.ready();payload=self.s.provider_payload(self.w,'launch')
        self.assertEqual(payload['mode'],'fixture');self.assertTrue(payload['paused']);self.assertEqual(len(payload['lead_list']),1)
        rows=payload['reconciliation'];self.assertEqual(len(rows),2)
        self.assertEqual(next(r['message_1'] for r in rows if r['status']=='blocked'),'')
    def test_csv_formula_safety(self):
        output=csv_bytes([{'name':'=HYPERLINK("https://example.org")','email':'x@example.org'}]).decode('utf-8-sig')
        self.assertIn("'=HYPERLINK",output)
    def test_xlsx_is_complete_ooxml(self):
        blob=xlsx_bytes([{'name':'لارا','value':'=SUM(A1:A2)'}])
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            self.assertEqual(z.testzip(),None)
            from xml.etree import ElementTree
            for name in z.namelist(): ElementTree.fromstring(z.read(name))
            self.assertIn('لارا',z.read('xl/worksheets/sheet1.xml').decode())
            self.assertNotIn('<f>',z.read('xl/worksheets/sheet1.xml').decode())
    def test_four_assets_and_onepager_approval(self):
        with self.assertRaises(Conflict): generate(self.s,self.w,'launch','onepager')
        self.ready();en=self.enrollment()
        for kind in ('brief','onepager','summary','card'):
            assetid=generate(self.s,self.w,'launch',kind,'ar',en['id'])
            asset=self.s.get('asset',self.w,assetid)
            self.assertIn('dir="rtl"',asset['html']);self.assertIn('contenteditable',asset['html']);self.assertTrue(asset['simulated'])
        summary=next(a for a in self.s.rows('asset',self.w) if a['kind']=='summary')
        self.assertIn('Contacts: 1',summary['html'])
    def test_asset_injection_escaped(self):
        en=self.ready();en=self.s.get('enrollment',self.w,en['id']);en['drafts']['en']='<script>alert(1)</script>'
        with self.s.db: self.s.put('enrollment',self.w,en['id'],en,campaign='launch',contact=en['contact'])
        with self.assertRaises(Conflict): generate(self.s,self.w,'launch','onepager','en',en['id'])
    def test_qr_deterministic_and_bounded(self):
        self.assertEqual(qr_matrix('https://example.org/lara'),qr_matrix('https://example.org/lara'))
        self.assertEqual(len(qr_matrix('https://example.org/lara')),33)
        with self.assertRaises(ValueError): qr_matrix('x'*79)
    def test_provider_transition_and_event_retry(self):
        en=self.ready();self.s.prepare(self.w,'launch','email');a=self.s.rows('action',self.w)[0]
        self.s.event(self.w,'sent',en['contact'],'sent',a['id'])
        self.assertEqual(self.s.get('action',self.w,a['id'])['state'],'sent')
        self.assertTrue(self.s.event(self.w,'sent',en['contact'],'sent',a['id'])['duplicate'])
        with self.assertRaises(Conflict): self.s.event(self.w,'new-fail',en['contact'],'failed',a['id'])
    def test_optout_from_new_import_cancels(self):
        en=self.ready();self.s.prepare(self.w,'launch','email')
        c=self.s.get('contact',self.w,en['contact'])
        self.s.import_leads(self.w,'launch',[c|{'opt_out':True}])
        self.assertTrue(all(a['state']=='cancelled' for a in self.s.rows('action',self.w)))
    def test_persistence_and_concurrent_event_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            path=str(Path(directory)/'demo.db');s=Store(path);s.seed()
            contact=s.rows('contact',self.w)[0]['id'];s.close()
            def process(_):
                store=Store(path)
                try:return store.event(self.w,'concurrent',contact,'reply')
                finally:store.close()
            with ThreadPoolExecutor(max_workers=2) as pool: result=list(pool.map(process,range(2)))
            self.assertEqual(sum(r['duplicate'] for r in result),1)
            s=Store(path);self.assertEqual(len(s.rows('event',self.w)),1);s.close()
    def test_retrieval_provenance_and_support(self):
        c=self.enrollment()['contact_record'];e=c['evidence'][0];e['approved']=True
        found=retrieve('operations expansion',c['evidence'])
        self.assertEqual(found[0]['id'],e['id'])
        checks=factual_support([{'text':e['text'],'evidence_ids':[e['id']]},{'text':'Invented result','evidence_ids':[e['id']]}],c['evidence'])
        self.assertEqual([c['supported'] for c in checks],[True,False])

if __name__=='__main__': unittest.main()
