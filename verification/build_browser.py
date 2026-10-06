"""Generate Playwright route responses by executing the real Python workflow.
HTTP handlers have separate direct tests. Browser replay never claims live transport.
"""
import copy
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from gtm.core import Store
from gtm.assets import generate
from gtm.exports import csv_bytes

def build():
    store=Store();store.seed();w='advisory'
    en=next(e for e in store.dashboard(w)['enrollments'] if e['campaign']=='launch' and e['contact_record']['name']=='Noura Ahmed')
    stages=[store.dashboard(w)];steps=[]
    def step(path,request,response):
        steps.append({'path':path,'request':request,'response':response});stages.append(store.dashboard(w))
    c=en['contact'];eid=en['id'];evidence=en['contact_record']['evidence'][0]['id']
    store.review_evidence(w,c,evidence,True,'Demo reviewer');step('/api/evidence',{'contact':c,'evidence':evidence,'approved':True,'reviewer':'Demo reviewer'},{'saved':True})
    draft=store.draft(w,eid);step('/api/draft',{'enrollment':eid},draft)
    approved=store.approve(w,eid,'Demo reviewer',draft['copy_version'],True);step('/api/approve',{'enrollment':eid,'reviewer':'Demo reviewer','version':draft['copy_version'],'claims_reviewed':True},approved)
    prepared=store.prepare(w,'launch','email');step('/api/prepare',{'campaign':'launch','channel':'email','language':'en'},prepared)
    all_assets={}
    for kind in ('brief','onepager','summary','card'):
        assetid=generate(store,w,'launch',kind,'en',eid if kind in ('brief','onepager') else None)
        body={'campaign':'launch','kind':kind,'language':'en'}
        if kind in ('brief','onepager'):body['enrollment']=eid
        step('/api/asset',body,{'id':assetid})
        all_assets[assetid]=store.get('asset',w,assetid)['html']
    drafts=copy.deepcopy(approved['drafts']);drafts['en']+='\nReviewed revision.'
    edited=store.edit(w,eid,drafts,approved['copy_version']);step('/api/edit',{'enrollment':eid,'version':approved['copy_version'],'drafts':drafts},edited)
    approved2=store.approve(w,eid,'Demo reviewer',edited['copy_version'],True);step('/api/approve',{'enrollment':eid,'reviewer':'Demo reviewer','version':edited['copy_version'],'claims_reviewed':True},approved2)
    prepared2=store.prepare(w,'launch','email');step('/api/prepare',{'campaign':'launch','channel':'email','language':'en'},prepared2)
    reply=store.event(w,'ui-reply',c,'reply');step('/api/event',{'id':'ui-reply','contact':c,'kind':'reply'},reply)
    duplicate=store.event(w,'ui-reply',c,'reply');step('/api/event',{'id':'ui-reply','contact':c,'kind':'reply'},duplicate)
    new=store.create_campaign(w,'Fresh campaign');step('/api/campaign',{'name':'Fresh campaign'},{'id':new})
    offer=store.get('offer',w,'operations')
    edited_offer={k:offer[k] for k in ('id','name','name_ar','terms','role_terms')}
    edited_offer.update(name='Reviewed operations scope',reviewer='Demo reviewer')
    saved_offer=store.save_offer(w,edited_offer);step('/api/offer',{'offer':edited_offer},saved_offer)
    brand=store.workspace(w)['brand'];brand['profile_url']='https://example.org/lara-approved?client=advisory'
    saved_brand=store.save_brand(w,brand);step('/api/brand',{'brand':brand},saved_brand)

    workspaces=[{'id':r['id'],'name':r['name']} for r in store.db.execute('SELECT id,name FROM workspace')]
    payload={'stages':stages,'steps':steps,'workspaces':workspaces,'otherBoard':store.dashboard('studio'),'html':(ROOT/'web/index.html').read_text(),'css':(ROOT/'web/styles.css').read_text(),'js':(ROOT/'web/app.js').read_text(),'assets':all_assets,'contact':c,'enrollment':eid}
    (ROOT/'verification/browser-data.json').write_text(json.dumps(payload,ensure_ascii=False)+'\n')
    script='''async (page) => {
await page.unrouteAll({behavior:"wait"});
const data=__DATA__;
let cursor=0;let failNext=false;const errors=[];const checks=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('http://gtm.test/**',async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname;
 let body,contentType='application/json',status=200;
 if(path==='/'){body=data.html;contentType='text/html'}
 else if(path==='/styles.css'){body=data.css;contentType='text/css'}
 else if(path==='/app.js'){body=data.js;contentType='application/javascript'}
 else if(path==='/api/workspaces')body=data.workspaces;
 else if(path==='/api/board'){
  if(failNext){failNext=false;status=503;body={error:'Fixture connection interrupted. Try again.'}}
  else body=url.searchParams.get('workspace')==='studio'?data.otherBoard:data.stages[cursor];
 }
 else if(path.startsWith('/asset/')){body=data.assets[path.split('/').pop()];contentType='text/html'}
 else if(req.method()==='POST'){
  const step=data.steps[cursor];const posted=req.postDataJSON();
  if(!step||step.path!==path)throw new Error('Unexpected browser mutation '+path+' at step '+cursor);
  for(const [key,value] of Object.entries(step.request))if(JSON.stringify(posted[key])!==JSON.stringify(value))throw new Error('Browser request mismatch '+key+' for '+path);
  if(posted.workspace!=='advisory')throw new Error('Mutation escaped client scope');
  body=step.response;cursor++;
 }else{status=404;body={error:'Unknown test route'}}
 await route.fulfill({status,contentType,body:typeof body==='string'?body:JSON.stringify(body)});
});
await page.setViewportSize({width:1440,height:1000});
await page.goto('http://gtm.test/');
await page.locator('#view table').first().waitFor();
checks.push('initial overview loaded from real domain fixture');
await page.screenshot({path:'__ROOT__/verification/overview-en.png',fullPage:true});
await page.locator('[data-review="'+data.enrollment+'"]').first().click();
await page.locator('[data-evidence]').first().click();
await page.getByText('Evidence decision saved.',{exact:false}).waitFor();
await page.locator('[data-action="draft"]').click();
await page.locator('#copy-en').waitFor();
await page.locator('#claims-check').check();
await page.locator('[data-action="approve"]').click();
await page.getByText('Current bilingual copy approved.',{exact:true}).waitFor();
checks.push('evidence review, bilingual draft and exact-version approval');
await page.locator('[data-tab="execution"]').click();
await page.locator('[data-action="prepare"]').click();
await page.getByText('Preparation recorded: 1 prepared, 1 held.',{exact:false}).waitFor();
checks.push('successful preparation preserves blocked recipient');
await page.locator('[data-tab="assets"]').click();
for(const kind of ['brief','onepager','summary','card']){
 await page.locator('[data-asset="'+kind+'"]').click();
 await page.waitForFunction(expected=>document.querySelectorAll('.asset-link').length===expected,['brief','onepager','summary','card'].indexOf(kind)+1);
}
checks.push('four editable asset types generated');
await page.locator('[data-tab="accounts"]').click();
await page.locator('#copy-en').fill((await page.locator('#copy-en').inputValue())+'\\nReviewed revision.');
await page.locator('[data-action="approve"]').click();
await page.getByText('Save your edits before approving this copy.',{exact:true}).waitFor();
await page.locator('[data-action="save"]').click();
await page.getByText('Copy saved. Previous approval', {exact:false}).waitFor();
await page.locator('#claims-check').check();
await page.locator('[data-action="approve"]').click();
await page.getByText('Current bilingual copy approved.',{exact:true}).waitFor();
checks.push('unsaved edits block approval; saved edits invalidate previous approval');
await page.locator('[data-tab="execution"]').click();
await page.locator('[data-action="prepare"]').click();
await page.getByText('Preparation recorded: 1 prepared, 1 held.',{exact:false}).waitFor();
await page.locator('#event-id').fill('ui-reply');
await page.locator('[data-action="event"]').click();
await page.getByText('Simulated event saved.',{exact:false}).waitFor();
await page.locator('#event-id').fill('ui-reply');
await page.locator('[data-action="event"]').click();
await page.getByText('Duplicate event reconciled.',{exact:false}).waitFor();
checks.push('reply cancellation and duplicate provider-event reconciliation');
await page.locator('[data-tab="history"]').click();
if(await page.locator('tbody tr .badge').filter({hasText:'cancelled'}).count()!==6)throw new Error('Expected six cancelled actions');
await page.locator('#campaign').selectOption('exceptions');
await page.locator('[data-tab="overview"]').click();
await page.screenshot({path:'__ROOT__/verification/exceptions-en.png',fullPage:true});
checks.push('exception scenario retains duplicates, rejected row, exclusions and sender hold');
for(const locale of ['en','ar']){
 await page.locator('#locale').selectOption(locale);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const tab of ['overview','accounts','execution','assets','history','knowledge']){
   await page.locator('[data-tab="'+tab+'"]').click();
   const over=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
   if(over)throw new Error('Horizontal page overflow: '+locale+'/'+width+'/'+tab);
  }
  await page.locator('[data-tab="overview"]').click();
  await page.screenshot({path:'__ROOT__/verification/overview-'+locale+'-'+width+'.png',fullPage:true});
 }
}
checks.push('all six tabs at desktop/phone widths in Arabic and English without page overflow');
await page.locator('#locale').selectOption('en');
await page.locator('#workspace').selectOption('studio');
await page.waitForFunction(()=>document.querySelector('#campaign').value==='studio-launch');
if(await page.locator('tbody tr').count()!==2)throw new Error('Unexpected client B data');
checks.push('client switch shows only client B records');
await page.locator('#workspace').selectOption('advisory');
await page.waitForFunction(()=>document.querySelector('#campaign').value==='launch');
await page.locator('#import-open').click();
await page.locator('#csv-input').fill('name,company,email\\nNew,Demo,new@example.org');
await page.locator('#mapping-label').click();
await page.locator('#mapping').fill('invalid JSON');
await page.locator('#import-submit').click();
if(!(await page.locator('#import-feedback').textContent()))throw new Error('Missing import error state');
await page.locator('#import-close').click();
checks.push('malformed column mapping shows local import error');
failNext=true;
await page.locator('#workspace').selectOption('studio');
await page.locator('.error-panel').waitFor();
await page.locator('[data-action="reload"]').click();
await page.locator('#view table').first().waitFor();
checks.push('load error and retry recovered');
await page.locator('#workspace').selectOption('advisory');
await page.waitForFunction(()=>document.querySelector('#campaign').value==='launch');
await page.evaluate(async()=>{const result=await api('/api/campaign',{name:'Fresh campaign'});state.campaign=result.id;await load();});
await page.getByText('Create a campaign to import', {exact:false}).count();
await page.locator('#view .empty').first().waitFor();
checks.push('new campaign empty state');
await page.locator('[data-tab="knowledge"]').click();
await page.locator('.evidence summary').filter({hasText:'Operations capacity review'}).click();
await page.locator('#offer-name-operations').fill('Reviewed operations scope');
await page.locator('[data-offer="operations"]').click();
await page.getByText('Client offer updated.',{exact:false}).waitFor();
await page.locator('#brand-profile_url').fill('https://example.org/lara-approved?client=advisory');
await page.locator('[data-action="save-brand"]').click();
await page.getByText('Brand profile saved for new assets.',{exact:true}).waitFor();
checks.push('client-specific offer and brand changes save through the review UI');

const assetPage=await page.context().newPage();
const card=Object.keys(data.assets).find(id=>data.assets[id].includes('Networking link QR code'));
await assetPage.setContent(data.assets[card]);
const qr=assetPage.locator('svg');if(await qr.count()!==1)throw new Error('QR missing');
await assetPage.screenshot({path:'__ROOT__/verification/card-en.png',fullPage:true});
await assetPage.close();
if(errors.length)throw new Error(errors.join('; '));
if(cursor!==data.steps.length)throw new Error('Unused domain mutations '+cursor+'/'+data.steps.length);
return {status:'passed',transport:'Playwright route replay of real Python domain transitions; in-memory HTTP handler suite tested separately',checks,mutations:cursor,page_errors:errors};
}'''
    script=script.replace('__DATA__',json.dumps(payload,ensure_ascii=False)).replace('__ROOT__',str(ROOT))
    (ROOT/'verification/browser-check.js').write_text(script)
    # A readable offline snapshot for review; mutation controls explain how to start the real server.
    board=stages[4]
    preview=payload['html'].replace('<link rel="stylesheet" href="/styles.css">','<style>'+payload['css']+'</style>').replace('<script src="/app.js" defer></script>','')
    bootstrap='''const snapshot=__SNAPSHOT__;window.fetch=async(url,options={})=>{if(options.method==='POST')return new Response(JSON.stringify({error:'This is a read-only offline preview. Run python3 -m gtm.server from the product directory for the full persistent workflow.'}),{status:409,headers:{'Content-Type':'application/json'}});const path=new URL(url,'http://preview.local');let value=path.pathname==='/api/workspaces'?snapshot.workspaces:snapshot.boards[path.searchParams.get('workspace')||'advisory'];return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}})};'''
    snapshot={'workspaces':workspaces,'boards':{'advisory':board,'studio':payload['otherBoard']}}
    bootstrap=bootstrap.replace('__SNAPSHOT__',json.dumps(snapshot,ensure_ascii=False).replace('</','<\\/'))
    preview=preview.replace('</body>','<script>'+bootstrap+'</script><script>'+payload['js']+'</script></body>')
    (ROOT/'preview.html').write_text(preview)
    (ROOT/'verification/asset-ar.html').write_text(__import__('gtm.assets',fromlist=['render']).render(stages[8]['assets'][0]['snapshot'],'brief','ar'))
    print('Generated domain-backed browser replay and read-only offline preview.')
if __name__=='__main__':build()
