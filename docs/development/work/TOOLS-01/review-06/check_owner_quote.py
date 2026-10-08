"""Compare only the relevant human user message with choice 11's committed quote.

No assistant turns, tool results, thinking, memory or unrelated user content are used.
The source is a local transcript, not cryptographically authenticated server history.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[5]
OUT=Path(__file__).resolve().parent
source=Path(sys.argv[1])
uuid='b78cf3f6-1be4-4a1f-ab8e-b7f7e0b20c13'
H='a50c38867c93c63094f271d099cec71624382577'
record=subprocess.check_output(['git','show',H+':docs/development/work/TOOLS-01/owner-choice-11.md'],cwd=ROOT,text=True)
section=record.split('## Owner answers, verbatim\n',1)[1].split('\n## Lists',1)[0]
quote='\n'.join(line[2:] for line in section.splitlines() if line.startswith('> '))
matches=[]
for number,raw in enumerate(source.read_bytes().splitlines(),1):
    data=json.loads(raw)
    if data.get('uuid')!=uuid:
        continue
    message=data.get('message',{})
    assert data['type']=='user' and message['role']=='user'
    content=message['content']
    if not isinstance(content,str):
        content='\n'.join(r['text'] for r in content if r.get('type')=='text')
    matches.append(dict(source_file=source.name,line=number,message_uuid=uuid,timestamp=data['timestamp'],
        source_role='user',source_line_sha256=hashlib.sha256(raw).hexdigest(),message=content,
        message_sha256=hashlib.sha256(content.encode()).hexdigest(),quote_sha256=hashlib.sha256(quote.encode()).hexdigest(),
        comparison='Remove Markdown > prefixes and surrounding block spacing only; no content reflow or normalization.',
        byte_equal=content.encode()==quote.encode()))
assert len(matches)==1
result=dict(candidate=H,evidence=matches[0],limit='Locally recorded human message; no independent server authentication.')
(OUT/'owner-choice-11-verbatim.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({k:v for k,v in matches[0].items() if k!='message'},indent=2))
