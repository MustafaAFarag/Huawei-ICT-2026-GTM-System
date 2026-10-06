import unittest
from gtm.core import Store
from gtm.assets import generate

class KnowledgeTests(unittest.TestCase):
    def setUp(self):self.s=Store();self.s.seed()
    def tearDown(self):self.s.close()
    def test_offering_changes_invalidate_only_this_client(self):
        en=self.s.dashboard('advisory')['enrollments'][0]
        self.s.review_evidence('advisory',en['contact'],en['contact_record']['evidence'][0]['id'],True,'Test')
        draft=self.s.draft('advisory',en['id']);self.s.approve('advisory',en['id'],'Test',draft['copy_version'],True);self.s.prepare('advisory','launch','email')
        offer=self.s.get('offer','advisory','operations');offer.update(name='Reviewed operations scope',reviewer='Test')
        self.s.save_offer('advisory',offer)
        en=next(e for e in self.s.dashboard('advisory')['enrollments'] if e['id']==en['id'])
        self.assertFalse(en['approved']);self.assertTrue(all(a['state']=='cancelled' for a in self.s.rows('action','advisory')))
        self.assertEqual(self.s.get('offer','studio','operations')['name'],'Operations capacity review')
    def test_brand_and_qr_validation(self):
        brand=self.s.workspace('advisory')['brand'];brand['profile_url']='javascript:alert(1)'
        with self.assertRaises(ValueError):self.s.save_brand('advisory',brand)
        brand['profile_url']='https://example.org/approved';brand['navy']='red;}body{display:none'
        with self.assertRaises(ValueError):self.s.save_brand('advisory',brand)
        brand['navy']='#14283f';brand['profile_name']='Lara Reviewed';self.s.save_brand('advisory',brand)
        assetid=generate(self.s,'advisory','launch','card')
        self.assertIn('Lara Reviewed',self.s.get('asset','advisory',assetid)['html'])
        self.assertEqual(self.s.workspace('studio')['brand']['profile_name'],'Lara')
    def test_case_insensitive_exclusion_flags(self):
        result=self.s.import_leads('advisory','launch',[{'name':'Test','company':'Company','email':'t@example.org','opt_out':' TRUE '}])
        c=self.s.get('contact','advisory',result[0]['contact_id']);self.assertTrue(c['opt_out'])
        result=self.s.import_leads('advisory','launch',[{'name':'Test2','company':'Company','email':'t2@example.org','opt_out':'maybe'}])
        self.assertEqual(result[0]['status'],'rejected')
    def test_strict_readiness_decisions(self):
        with self.assertRaises(ValueError):self.s.sender('advisory','launch','false','Test')
        en=self.s.dashboard('advisory')['enrollments'][0]
        with self.assertRaises(ValueError):self.s.review_evidence('advisory',en['contact'],en['contact_record']['evidence'][0]['id'],'false','Test')

if __name__=='__main__':unittest.main()
