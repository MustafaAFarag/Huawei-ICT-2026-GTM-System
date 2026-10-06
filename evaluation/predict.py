"""Score frozen test queries with rules, multilingual embeddings or BGE reranker.
Neural runs require an explicitly supplied local model path. No silent downloads.
"""
import argparse
import json
import time
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from gtm.core import Store

def main():
    p=argparse.ArgumentParser();p.add_argument('--data',type=Path,default=Path('evaluation/data'));p.add_argument('--method',choices=['rules','embeddings','cross-encoder'],required=True);p.add_argument('--model-path',type=Path);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    packs=json.loads((a.data/'packs.json').read_text());results=[]
    store=Store();store.seed()
    if a.method!='rules':
        if not a.model_path or not a.model_path.is_dir(): p.exit(2,'Supply a frozen local model directory. No model download or benchmark occurred.\n')
        try:
            import torch
            from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
        except ImportError as error: p.exit(2,f'Neural dependencies unavailable: {error}\n')
        tokenizer=AutoTokenizer.from_pretrained(a.model_path,local_files_only=True)
        cls=AutoModel if a.method=='embeddings' else AutoModelForSequenceClassification
        model=cls.from_pretrained(a.model_path,local_files_only=True).eval()
        for param in model.parameters(): param.requires_grad=False
    for pack in packs:
        if pack['split']!='test': continue
        for role in pack['roles']:
            query=role+' · '+' '.join(e['text'] for e in pack['evidence'])
            for offer in pack['offers']:
                start=time.perf_counter()
                if a.method=='rules':
                    score=next(o['score'] for o in store.rank('advisory',{'role':role,'evidence':pack['evidence']}) if o['offer_id']==offer['id'])
                elif a.method=='embeddings':
                    with torch.inference_mode():
                        inputs=tokenizer(['query: '+query,'passage: '+offer['name']],padding=True,truncation=True,max_length=512,return_tensors='pt')
                        hidden=model(**inputs).last_hidden_state
                        mask=inputs['attention_mask'].unsqueeze(-1)
                        pooled=(hidden*mask).sum(1)/mask.sum(1)
                        score=float(torch.nn.functional.cosine_similarity(pooled[0:1],pooled[1:2])[0])
                else:
                    with torch.inference_mode():
                        inputs=tokenizer(query,offer['name'],truncation=True,max_length=1024,return_tensors='pt')
                        score=float(model(**inputs).logits.reshape(-1)[0])
                results.append({'company_id':pack['company_id'],'role':role,'offer_id':offer['id'],'score':score,'latency_ms':(time.perf_counter()-start)*1000,'model':a.method+':'+(str(a.model_path) if a.model_path else 'transparent-rules-v1')})
    a.output.write_text(json.dumps(results,indent=2)+'\n')
    print('Predictions saved. They are not evaluation results until independently adjudicated labels pass the evaluator.')
if __name__=='__main__': main()
