"""Held-out ranking evaluation. Refuses missing human labels or split leakage."""
import argparse
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

def validate(packs,judgments,reviewers):
    lookup={p['company_id']:p for p in packs}
    if len(lookup)!=len(packs): raise ValueError('Company identifiers must be unique.')
    groups=defaultdict(set);sources=defaultdict(set)
    for p in packs:
        if p['split'] not in ('train','validation','test'): raise ValueError('Unknown split.')
        groups[p['group_id']].add(p['split'])
        for e in p['evidence']: sources[e['source']].add(p['split'])
    if any(len(s)>1 for s in [*groups.values(),*sources.values()]): raise ValueError('Related accounts or duplicate sources cross dataset splits.')
    seen=set()
    for j in judgments:
        key=(j['company_id'],j['role'],j['offer_id'])
        if key in seen: raise ValueError('Duplicate relevance judgment.')
        seen.add(key)
        p=lookup.get(j['company_id'])
        if p is None or j['role'] not in p['roles'] or j['offer_id'] not in {o['id'] for o in p['offers']}: raise ValueError('Judgment refers to an unknown company, role or offer.')
        if any(type(j.get(k)) is not int or j[k] not in (0,1,2) for k in ('reviewer_a','reviewer_b','adjudicated')): raise ValueError('Independent human labels and adjudication are incomplete. No benchmark reported.')
        if not j.get('adjudicator'): raise ValueError('Every adjudicated label must identify its reviewer.')
    expected={(p['company_id'],r,o['id']) for p in packs for r in p['roles'] for o in p['offers']}
    if seen!=expected: raise ValueError('Every account–role–offer combination needs exactly one judgment.')
    if any(not reviewers.get(k,{}).get('name') or not reviewers[k].get('expertise') for k in ('reviewer_a','reviewer_b')): raise ValueError('Report both reviewers’ names and expertise.')
    if reviewers['reviewer_a']['name']==reviewers['reviewer_b']['name']: raise ValueError('Two independent reviewers are required.')
    return lookup

def ndcg(labels):
    dcg=lambda arr:sum((2**label-1)/math.log2(i+2) for i,label in enumerate(arr[:3]))
    ideal=dcg(sorted(labels,reverse=True))
    return dcg(labels)/ideal if ideal else 0.0

def agreement(judgments):
    n=len(judgments)
    observed=sum(j['reviewer_a']==j['reviewer_b'] for j in judgments)/max(1,n)
    a=Counter(j['reviewer_a'] for j in judgments);b=Counter(j['reviewer_b'] for j in judgments)
    expected=sum(a[v]*b[v]/max(1,n*n) for v in (0,1,2))
    return {'raw_agreement':observed,'cohen_kappa':(observed-expected)/(1-expected) if expected<1 else None}

def evaluate(packs,judgments,predictions,reviewers):
    lookup=validate(packs,judgments,reviewers)
    gold={(j['company_id'],j['role'],j['offer_id']):j['adjudicated'] for j in judgments}
    queries={(p['company_id'],r) for p in packs if p['split']=='test' for r in p['roles']}
    grouped=defaultdict(dict);latencies=[]
    model_names=set()
    for p in predictions:
        key=(p['company_id'],p['role'])
        if key not in queries: raise ValueError('Predictions must contain only held-out test queries.')
        if p['offer_id'] not in {o['id'] for o in lookup[p['company_id']]['offers']}: raise ValueError('Prediction offer was not found.')
        if p['offer_id'] in grouped[key]: raise ValueError('Duplicate prediction.')
        if not math.isfinite(p['score']) or not math.isfinite(p['latency_ms']) or p['latency_ms']<0: raise ValueError('Scores and latencies must be finite.')
        grouped[key][p['offer_id']]=p['score'];latencies.append(p['latency_ms']);model_names.add(p['model'])
    if set(grouped)!=queries: raise ValueError('Held-out predictions are incomplete.')
    if len(model_names)!=1: raise ValueError('Evaluate one frozen model at a time.')
    metrics=[];examples=[];relevant=[]
    for (company,role),scores in sorted(grouped.items()):
        if set(scores)!={o['id'] for o in lookup[company]['offers']}: raise ValueError('Each query must score every offer.')
        ranked=sorted(scores,key=lambda o:(-scores[o],o))
        labels=[gold[company,role,o] for o in ranked]
        metrics.append(ndcg(labels))
        if max(labels)>0: relevant.append(int(labels[0]==max(labels)))
        if labels[0]<max(labels): examples.append({'company':company,'role':role,'ranked_offers':ranked,'labels':labels})
    return {'model':next(iter(model_names)),'split':'test','queries':len(metrics),'NDCG@3':sum(metrics)/max(1,len(metrics)),'best_relevant_offer_accuracy':sum(relevant)/len(relevant) if relevant else None,'zero_relevance_queries':len(metrics)-len(relevant),'latency_ms_mean_per_offer':sum(latencies)/max(1,len(latencies)),'reviewer_agreement':agreement(judgments),'reviewers':reviewers,'errors':examples,'origins':dict(Counter(p['origin'] for p in packs)),'scope':'Relevance judgments only. Synthetic packs cannot establish commercial fit or response rates.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--data',type=Path,default=Path('evaluation/data'));p.add_argument('--predictions',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    read=lambda name:json.loads((a.data/name).read_text())
    try: result=evaluate(read('packs.json'),read('judgments.json'),json.loads(a.predictions.read_text()),read('reviewers.json'))
    except (ValueError,FileNotFoundError) as error: p.exit(2,str(error)+'\n')
    a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__': main()
