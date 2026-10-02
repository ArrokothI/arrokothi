#!/usr/bin/env python3
"""Codex/GPT-6; local pinned reads; no external-consumer access. Declared searches, not semantic proof."""
from pathlib import Path
import subprocess,sys
sys.dont_write_bytecode = True
from session import SESSION
P=Path(__file__).resolve().parents[1];R=P.parents[3];B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
searches=[('compatibility',r'@arrokothi/kernel|packages/kernel|kernel/src',['.',':!packages/kernel',':!docs',':!mental-model']),('claim',r'plain[- ]object|plain data|prototyp|class instances?|byte arrays?|typed arrays?|Uint8Array|ArrayBuffer|\bMaps?\b|\bDates?\b|\bSets?\b|built-?in|exotic|coerc|unsupported[_ ]form|silently (drop|discard)|refus',['docs/development/002-implemented-kernel-baseline.md','docs/guides','mental-model/concepts/values.md','packages/kernel/src/values.ts','docs/development/README.md',':(glob)packages/**/README.md'])]
for label,pattern,paths in searches:
 args=['git','-C',str(R),'grep','-n','-i','-E',pattern,B,'--',*paths];r=subprocess.run(args,capture_output=True,text=True);assert r.returncode in (0,1),r.stderr
 text=SESSION+'\n\n'+repr(args[3:])+'\nexit '+str(r.returncode)+'\n'+r.stdout+r.stderr
 if '--check' in sys.argv:assert (P/'probes'/f'{label}-search.txt').read_text()==text,label
 else:(P/'probes'/f'{label}-search.txt').write_text(text)
 print(label,'PASS',len(r.stdout.splitlines()),'matches')
