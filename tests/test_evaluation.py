import json
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'evaluation'))
from prepare import prepare
from evaluate import validate,evaluate,ndcg

class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name);prepare(self.path)
        self.packs=json.loads((self.path/'packs.json').read_text());self.labels=json.loads((self.path/'judgments.json').read_text())
        self.reviewers={'reviewer_a':{'name':'Fixture A','expertise':'Synthetic test only'},'reviewer_b':{'name':'Fixture B','expertise':'Synthetic test only'}}
    def tearDown(self):self.tmp.cleanup()
    def label_fixture(self):
        for j in self.labels:j.update(reviewer_a=2 if j['offer_id']=='operations' else 0,reviewer_b=2 if j['offer_id']=='operations' else 0,adjudicated=2 if j['offer_id']=='operations' else 0,adjudicator='Fixture A')
    def test_480_empty_slots_and_company_split(self):
        self.assertEqual(len(self.labels),480)
        self.assertEqual([sum(p['split']==s for p in self.packs) for s in ('train','validation','test')],[56,12,12])
        with self.assertRaises(ValueError):validate(self.packs,self.labels,self.reviewers)
    def test_duplicate_sources_cross_split_rejected(self):
        self.label_fixture();a=next(p for p in self.packs if p['split']=='train');b=next(p for p in self.packs if p['split']=='test');b['evidence'][0]['source']=a['evidence'][0]['source']
        with self.assertRaises(ValueError):validate(self.packs,self.labels,self.reviewers)
    def test_duplicate_judgment_rejected(self):
        self.label_fixture();self.labels.append(self.labels[0])
        with self.assertRaises(ValueError):validate(self.packs,self.labels,self.reviewers)
    def test_ndcg_formula(self):
        self.assertEqual(ndcg([2,1,0]),1);self.assertLess(ndcg([0,1,2]),1);self.assertEqual(ndcg([0,0,0]),0)
    def test_perfect_synthetic_predictions_only_for_metric_verification(self):
        self.label_fixture();predictions=[]
        for p in self.packs:
            if p['split']!='test':continue
            for role in p['roles']:
                for offer in p['offers']:predictions.append({'company_id':p['company_id'],'role':role,'offer_id':offer['id'],'score':2 if offer['id']=='operations' else 0,'latency_ms':1,'model':'test-fixture'})
        result=evaluate(self.packs,self.labels,predictions,self.reviewers)
        self.assertEqual(result['NDCG@3'],1);self.assertEqual(result['queries'],24)
        self.assertEqual(result['origins'],{'synthetic':80})
        with self.assertRaises(ValueError):evaluate(self.packs,self.labels,predictions[:-1],self.reviewers)

if __name__=='__main__':unittest.main()
