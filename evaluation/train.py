"""Bounded BGE adaptation experiment; requires independently reviewed labels."""
import argparse
import json
import random
from pathlib import Path
from evaluate import validate

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--data',type=Path,default=Path('evaluation/data'));parser.add_argument('--model-path',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--steps',type=int,default=60);parser.add_argument('--device',default='cpu');args=parser.parse_args()
    if not 1<=args.steps<=200: parser.exit(2,'Training is bounded to 1–200 steps.\n')
    read=lambda name:json.loads((args.data/name).read_text())
    packs=read('packs.json');judgments=read('judgments.json')
    try: lookup=validate(packs,judgments,read('reviewers.json'))
    except ValueError as error: parser.exit(2,str(error)+'\n')
    if not args.model_path.is_dir(): parser.exit(2,'Frozen local model directory was not found.\n')
    try:
        import torch
        from transformers import AutoTokenizer,AutoModelForSequenceClassification
    except ImportError as error: parser.exit(2,f'Training dependencies unavailable: {error}\n')
    torch.manual_seed(20261006);randomizer=random.Random(20261006)
    model=AutoModelForSequenceClassification.from_pretrained(args.model_path,local_files_only=True).to(args.device)
    tokenizer=AutoTokenizer.from_pretrained(args.model_path,local_files_only=True)
    train=[j for j in judgments if lookup[j['company_id']]['split']=='train']
    validation=[j for j in judgments if lookup[j['company_id']]['split']=='validation']
    if not train or not validation: parser.exit(2,'Training and validation company splits must both be populated.\n')
    optimizer=torch.optim.AdamW(model.parameters(),lr=1e-5)
    def batch(records):
        queries=[];offers=[]
        for j in records:
            p=lookup[j['company_id']];queries.append(j['role']+' · '+' '.join(e['text'] for e in p['evidence']))
            offers.append(next(o['name'] for o in p['offers'] if o['id']==j['offer_id']))
        inputs=tokenizer(queries,offers,padding=True,truncation=True,max_length=512,return_tensors='pt').to(args.device)
        labels=torch.tensor([j['adjudicated']/2 for j in records],device=args.device)
        return inputs,labels
    best=float('inf');losses=[];args.output.mkdir(parents=True,exist_ok=True)
    for step in range(args.steps):
        records=randomizer.sample(train,min(2,len(train)));inputs,labels=batch(records)
        model.train();optimizer.zero_grad()
        scores=model(**inputs).logits.reshape(-1)
        loss=torch.nn.functional.binary_cross_entropy_with_logits(scores,labels);loss.backward();torch.nn.utils.clip_grad_norm_(model.parameters(),1.0);optimizer.step()
        if (step+1)%10==0 or step==args.steps-1:
            model.eval();values=[]
            with torch.inference_mode():
                for start in range(0,len(validation),2):
                    inputs,labels=batch(validation[start:start+2]);values.append(float(torch.nn.functional.binary_cross_entropy_with_logits(model(**inputs).logits.reshape(-1),labels)))
            val=sum(values)/len(values);losses.append({'step':step+1,'validation_loss':val})
            if val<best:
                best=val;model.save_pretrained(args.output);tokenizer.save_pretrained(args.output)
    (args.output/'experiment.json').write_text(json.dumps({'seed':20261006,'steps':args.steps,'base_model':str(args.model_path),'validation_checkpoints':losses,'test_used_during_training':False,'status':'Training experiment only. Run frozen held-out evaluation before selecting it.'},indent=2)+'\n')
if __name__=='__main__':main()
