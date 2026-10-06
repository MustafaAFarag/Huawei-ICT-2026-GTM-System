"""Isolated, editable HTML assets from reviewed campaign snapshots."""
import html
import json
import subprocess
import sys
import uuid
from urllib.parse import urlparse
from .core import ROOT, Conflict, now
from .qr import svg

KINDS=('brief','onepager','summary','card')

def render(snapshot,kind,language):
    if kind not in KINDS or language not in ('en','ar'): raise ValueError('Unknown asset or language.')
    esc=lambda value:html.escape(str(value),quote=True)
    brand=snapshot['workspace']['brand']
    title={'brief':('Account research brief','ملخص أبحاث الحساب'),'onepager':('Account proposal','مقترح التعاون'),'summary':('Campaign summary','ملخص الحملة'),'card':('Let’s keep in touch','لنبقَ على تواصل')}[kind][language=='ar']
    ens=snapshot['enrollments']
    sections=[]
    if kind=='card':
        url=brand['profile_url']
        if urlparse(url).scheme!='https': raise ValueError('Networking destination must use HTTPS.')
        sections.append(f'<h2 contenteditable="true" dir="auto">{esc(brand["profile_name"])}</h2><p contenteditable="true" dir="auto">{esc(brand["profile_role"])}</p><div class="qr">{svg(url)}</div><a href="{esc(url)}" dir="ltr">{esc(url)}</a><p>Demonstration destination · replace with your approved profile URL.</p>')
    elif kind=='summary':
        total=len(ens)
        approved=sum(e['approved'] for e in ens)
        holds=sum(bool(e['holds']) for e in ens)
        actions=snapshot['actions']
        # Values and widths derive only from the supplied records.
        metrics={'Contacts':total,'Approved':approved,'Needs attention':holds,'Scheduled':sum(a['state']=='scheduled' for a in actions),'Cancelled':sum(a['state']=='cancelled' for a in actions),'Failed':sum(a['state']=='failed' for a in actions)}
        sections.append('<div class="chart">'+''.join(f'<div><span>{esc(k)}</span><b>{v}</b><i style="width:{100*v/max(1,max(metrics.values()))}%" aria-label="{esc(k)}: {v}"></i></div>' for k,v in metrics.items())+'</div>')
        sections.append('<h2>Attention next / الخطوة التالية</h2>'+''.join(f'<p dir="auto"><bdi>{esc(e["contact_record"]["name"])}</bdi> · {esc("; ".join(e["holds"]) or "Review channel readiness and prepare export.")}</p>' for e in ens))
    else:
        for en in ens:
            c=en['contact_record']
            sections.append(f'<section><p class="eyebrow" dir="auto">{esc(c["company"])}</p><h2 contenteditable="true" dir="auto">{esc(c["name"])} · <bdi>{esc(c["role"])}</bdi></h2>')
            if kind=='onepager':
                sections.append(f'<p class="copy" contenteditable="true" dir="auto">{esc(en["drafts"][language])}</p>')
                sections.append('<p>Scope and assumptions: exploratory discussion only. No unverified service-specific case study or internal need is asserted.</p>')
            else:
                sections.append('<h3>Evidence / الأدلة</h3>')
            for e in c['evidence']:
                if e['approved'] and not e.get('conflict'):
                    source=esc(e['source'])
                    source_html=f'<a href="{source}" dir="ltr">{source}</a>' if urlparse(e['source']).scheme in ('http','https') else f'<bdi>{source}</bdi>'
                    sections.append(f'<p contenteditable="true" dir="auto">{esc(e["text"])}</p><small>{source_html} · <bdi>{esc(e["date"])}</bdi> · {esc(e.get("origin","imported"))}</small>')
            sections.append('<h3>Offer hypothesis / مقترح الخدمة</h3><p dir="auto">'+esc(en['ranking'][0]['name_ar'] if language=='ar' else en['ranking'][0]['name'])+' · '+esc(en['ranking'][0]['reason'])+'</p></section>')
    token_css=(ROOT/'design-systems/lara/tokens.css').read_text()
    css='''*{box-sizing:border-box}body{margin:0;background:#e9e8e4;color:var(--navy);font:16px/1.7 Arial,sans-serif}main{max-width:900px;margin:36px auto;background:white;padding:60px;border-top:9px solid var(--gold)}header{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #ddd;padding-bottom:24px}.eyebrow,small{font-size:12px}h1{font-size:44px;line-height:1.15;margin:38px 0 30px}h2{font-size:26px}h3{font-size:15px;color:var(--gold)}section{padding:20px 0;border-top:1px solid #ddd}.copy{white-space:pre-wrap}a{overflow-wrap:anywhere;color:var(--navy)}small{display:block;overflow-wrap:anywhere}.qr{width:205px;margin:24px 0}.chart div{position:relative;padding:12px 0;border-bottom:1px solid #ddd;display:flex;justify-content:space-between}.chart i{display:block;position:absolute;bottom:0;inset-inline-start:0;background:var(--gold);height:3px}footer{margin-top:40px;border-top:1px solid #ddd;padding-top:15px;font-size:12px}button{padding:12px;background:var(--navy);color:white;border:0;cursor:pointer;min-height:44px}[contenteditable]:focus{outline:2px solid var(--gold)}@media(max-width:600px){main{padding:24px;margin:0}h1{font-size:32px}header{flex-wrap:wrap}}@media print{body{background:white}main{margin:0;padding:20px;max-width:none}button{display:none}section{break-inside:avoid}}'''
    return f'<!doctype html><html lang="{language}" dir="{"rtl" if language=="ar" else "ltr"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><style>{token_css}:root{{--navy:{esc(brand["navy"])};--gold:{esc(brand["gold"])}}}{css}</style><main><header><b dir="auto">{esc(brand["name"])}</b><span>GTM / <bdi>{esc(snapshot["campaign"]["name"])}</bdi></span></header><p class="eyebrow">SYNTHETIC DEMONSTRATION · SIMULATED EXECUTION</p><h1 contenteditable="true" dir="auto">{esc(title)}</h1>{"".join(sections)}<footer>Version <bdi>{snapshot["campaign"]["version"]}</bdi> · {esc(snapshot["created_at"])} · Template output from reviewed records. Local edits do not change approved campaign copy.<p><button onclick="window.print()">Print / PDF</button> <button onclick="save()">Save edited HTML</button></p></footer></main><script>function save(){{const source="<!doctype html>"+document.documentElement.outerHTML;const url=URL.createObjectURL(new Blob([source],{{type:"text/html"}}));const a=document.createElement("a");a.href=url;a.download="edited-asset.html";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}</script></html>'

def generate(store,w,cid,kind,language='en',eid=None):
    if kind not in KINDS: raise ValueError('Choose one of the four supported assets.')
    campaign=store.get('campaign',w,cid)
    board=store.dashboard(w)
    ens=[e for e in board['enrollments'] if e['campaign']==cid and (eid is None or e['id']==eid)]
    if kind in ('brief','onepager') and not ens: raise ValueError('Select an account in this campaign.')
    if kind=='onepager' and any(not e['approved'] or e['holds'] for e in ens):
        raise Conflict('Prospect-facing one-pagers require approved, supported copy for every selected contact.')
    snapshot={'workspace':board['workspace'],'campaign':campaign,'enrollments':ens,'actions':[a for a in board['actions'] if a['campaign']==cid],'created_at':now()}
    # Each job has its own subprocess; no shared hosted design daemon or client memory.
    process=subprocess.run([sys.executable,'-m','gtm.render_job',kind,language],input=json.dumps(snapshot,ensure_ascii=False),text=True,capture_output=True,cwd=ROOT,timeout=15)
    if process.returncode: raise ValueError('Asset rendering failed. Check the approved profile destination and snapshot.')
    assetid=str(uuid.uuid4())
    with store.db:
        store.put('asset',w,assetid,{'kind':kind,'language':language,'snapshot':snapshot,'html':process.stdout,'created_at':now(),'simulated':True},campaign=cid)
        store.log(w,'asset_generated',asset=assetid,kind_name=kind,campaign=cid)
    return assetid
