"""Run the requested clean-C composition alone, recording raw output and identity."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(sys.argv[1]).resolve()
out = Path(__file__).resolve().parent
env = os.environ.copy()
env['PATH'] = '/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:' + env['PATH']
cmd = ['python3', '-B', 'scripts/packet_tools.py', 'verify', '--revision',
       '83094969e591dba5c4f25d19c572522b78a7a396', '--spec',
       'docs/development/work/TOOLS-01/checks.json']
def capture(args):
    return subprocess.check_output(args, cwd=root, env=env, text=True).strip()
def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
record = dict(cwd=str(root), command=cmd, wrapper='caffeinate -i',
              head=capture(['git', 'rev-parse', 'HEAD']),
              status_before=capture(['git', 'status', '--porcelain']),
              node=capture(['node', '--version']), python=capture(['python3', '--version']),
              node_path=capture(['which', 'node']), start=now())
assert record['head'] == cmd[5] and record['status_before'] == ''
assert record['node'] == 'v26.10.0'
(out / 'verify-run.json').write_text(json.dumps(record, indent=2) + '\n')
with (out / 'verify.json').open('w') as stdout, (out / 'verify.stderr').open('w') as stderr:
    result = subprocess.run(cmd, cwd=root, env=env, stdout=stdout, stderr=stderr)
record.update(end=now(), exit_code=result.returncode,
              status_after=capture(['git', 'status', '--porcelain']))
(out / 'verify-run.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2), flush=True)
sys.exit(result.returncode)
