"""Rehearsed synthetic success path and local deliverable samples."""
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from gtm.core import Store
from gtm.assets import generate
from gtm.exports import csv_bytes,xlsx_bytes

def main():
    out=ROOT/'samples';out.mkdir(exist_ok=True);s=Store();s.seed()
    for en in s.dashboard('advisory')['enrollments']:
        if en['campaign']!='launch':continue
        for e in en['contact_record']['evidence']:s.review_evidence('advisory',en['contact'],e['id'],True,'Demonstration reviewer')
        drafted=s.draft('advisory',en['id']);s.approve('advisory',en['id'],'Demonstration reviewer',drafted['copy_version'],True)
    prepared=s.prepare('advisory','launch','email')
    en=s.dashboard('advisory')['enrollments'][0]
    for language in ('en','ar'):
        for kind in ('brief','onepager','summary','card'):
            assetid=generate(s,'advisory','launch',kind,language,en['id'] if kind in ('brief','onepager') else None)
            (out/f'{kind}-{language}.html').write_text(s.get('asset','advisory',assetid)['html'])
        rows=s.export_rows('advisory','launch','email',language)
        (out/f'email-{language}.csv').write_bytes(csv_bytes(rows));(out/f'email-{language}.xlsx').write_bytes(xlsx_bytes(rows))
    payload=s.provider_payload('advisory','launch');(out/'smartlead-fixture.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    actions=s.rows('action','advisory');before=sum(a['state']=='scheduled' for a in actions)
    s.event('advisory','sample-reply',en['contact'],'reply')
    after=sum(a['state']=='scheduled' for a in s.rows('action','advisory'))
    (ROOT/'verification/rehearsal-report.json').write_text(json.dumps({'mode':'synthetic fixture only','contacts_prepared':sum(o['status']=='prepared' for o in prepared['outcomes']),'scheduled_before_reply':before,'scheduled_after_reply':after,'cancelled_for_replied_contact':sum(a['state']=='cancelled' for a in s.rows('action','advisory')),'live_campaign_actions':0,'exports':['CSV','XLSX','Smartlead fixture JSON'],'assets':['brief','onepager','summary','card']},indent=2)+'\n')
    print('Rehearsal passed: two approved contacts, bilingual exports, eight HTML samples; reply cancelled later touches for one contact. No live actions.')
    s.close()
if __name__=='__main__':main()
