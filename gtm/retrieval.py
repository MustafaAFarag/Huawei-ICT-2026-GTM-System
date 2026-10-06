"""Deterministic retrieval baseline; evidence is data, never an instruction."""
import math
from collections import Counter
from .core import tokens

def retrieve(query,evidence,k=5):
    candidates=[e for e in evidence if e.get('approved') and not e.get('conflict')]
    if not candidates: return []
    query_terms=tokens(query)
    tokenized=[tokens(e['text']) for e in candidates]
    frequencies=Counter(term for terms in tokenized for term in terms)
    scored=[]
    for e,terms in zip(candidates,tokenized):
        score=sum(math.log(1+(len(candidates)-frequencies[term]+0.5)/(frequencies[term]+0.5)) for term in query_terms&terms)
        if score>0: scored.append(e | {'retrieval_score':score})
    return sorted(scored,key=lambda e:(-e['retrieval_score'],e['id']))[:k]

def factual_support(claims,evidence):
    """Exact referenced excerpt check; not a semantic factuality judge."""
    lookup={e['id']:e for e in evidence if e.get('approved') and not e.get('conflict')}
    return [{'claim':c['text'],'supported':any(c['text'] in lookup[id]['text'] for id in c.get('evidence_ids',[]) if id in lookup)} for c in claims]
