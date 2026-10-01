#!/usr/bin/env python3
from pathlib import Path
import subprocess
P=Path(__file__).resolve().parents[1];R=P.parents[3];B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
for label,pattern,paths in [('compatibility','@arrokothi/kernel|packages/kernel|kernel/src',['packages/sdk','packages/agents','packages/runtime-integrations','package.json']),('claim','re-prototyp|exotic|Maps|Dates|typed arrays|ArrayBuffer|unsupported_form',['docs/development/002-implemented-kernel-baseline.md','docs/guides','mental-model/concepts/values.md'])]:
 args=['git','-C',str(R),'grep','-n','-i','-E',pattern,B,'--',*paths];r=subprocess.run(args,capture_output=True,text=True);print(label,'exit',r.returncode);print(r.stdout,r.stderr)
