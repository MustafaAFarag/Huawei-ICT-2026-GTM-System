"""Prepare 80 visibly synthetic packs and 480 EMPTY human judgment slots."""
import json
import random
from pathlib import Path

def prepare(output):
    randomizer=random.Random(20261006)
    ids=[f'synthetic-{i:03}' for i in range(80)]
    randomizer.shuffle(ids)
    splits={id:('train' if i<56 else 'validation' if i<68 else 'test') for i,id in enumerate(ids)}
    offers=[('workforce','Workforce advisory','workforce hiring'),('operations','Operations capacity review','operational expansion capacity'),('partnerships','Partnership development','partnerships integration')]
    packs=[]
    for i,id in enumerate(sorted(ids)):
        offer=offers[i%3]
        packs.append({'company_id':id,'group_id':id,'split':splits[id],'origin':'synthetic','license':'CC0-1.0','modifications':'Generated original fixture; deliberately no response labels.','intended_use':'Harness testing and reviewer dry run only; not a demand or commercial-performance benchmark.','evidence':[{'id':id+'-source','text':f'Synthetic organization describes {offer[2]}.','source':'fixture://evaluation/'+id,'date':'2026-10-01','approved':True}],'roles':['HR director','Partnerships manager'],'offers':[{'id':o[0],'name':o[1]} for o in offers]})
    judgments=[{'company_id':p['company_id'],'role':role,'offer_id':offer['id'],'reviewer_a':None,'reviewer_b':None,'adjudicated':None,'adjudicator':None,'notes':''} for p in packs for role in p['roles'] for offer in p['offers']]
    output.mkdir(parents=True,exist_ok=True)
    (output/'packs.json').write_text(json.dumps(packs,ensure_ascii=False,indent=2)+'\n')
    (output/'judgments.json').write_text(json.dumps(judgments,ensure_ascii=False,indent=2)+'\n')
    (output/'reviewers.json').write_text(json.dumps({'reviewer_a':{'name':None,'expertise':None},'reviewer_b':{'name':None,'expertise':None}},indent=2)+'\n')
    print(f'{len(packs)} synthetic packs; {len(judgments)} unlabelled judgments; split 56/12/12. No benchmark run.')
if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=Path('evaluation/data'));args=parser.parse_args();prepare(args.output)
