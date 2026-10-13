#!/usr/bin/env python3
"""Sample this Compose project's memory/CPU while local browser checks run."""
import argparse, datetime, json, subprocess, time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--duration',type=int,default=120);p.add_argument('--output',default='.local/prep-resources.json');args=p.parse_args()
if args.duration < 1: p.error('--duration must be positive')
units={'B':1,'kB':1000,'KB':1000,'KiB':1024,'MB':1000000,'MiB':1024**2,'GB':1000000000,'GiB':1024**3}
def size(value):
    import re
    m=re.fullmatch(r'([\d.]+)([A-Za-z]+)',value.strip());return round(float(m[1])*units[m[2]])
start=time.monotonic();peak_total=0;peaks={};samples=0
while time.monotonic()-start<args.duration:
    output=subprocess.check_output(['docker','stats','--no-stream','--format','{{json .}}'],text=True)
    rows=[json.loads(x) for x in output.splitlines() if x.strip()]
    total=0
    for r in rows:
        if not r['Name'].startswith('revenue-workspace-'):continue
        memory=size(r['MemUsage'].split('/')[0]);cpu=float(r['CPUPerc'].rstrip('%'));total+=memory
        current=peaks.setdefault(r['Name'],{'peakMemoryBytes':0,'peakCpuPercent':0})
        current['peakMemoryBytes']=max(current['peakMemoryBytes'],memory);current['peakCpuPercent']=max(current['peakCpuPercent'],cpu)
    peak_total=max(peak_total,total);samples+=1
    data={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'samples':samples,'durationSeconds':round(time.monotonic()-start),'peakAggregateMemoryBytes':peak_total,'containers':peaks,'limits':'Sampled Docker working-set memory/CPU during sequential local fixture checks; excludes host/build memory and live models. Not a cloud capacity or concurrency benchmark.'}
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,indent=2))
    time.sleep(2)
print(json.dumps(data,indent=2))
