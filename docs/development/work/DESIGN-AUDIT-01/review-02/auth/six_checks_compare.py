#!/usr/bin/env python3
"""Review 02 (Claude Code desktop, claude-opus-5-5, 2026-10-01). Access: the owner's local Claude Code
transcripts on this machine; no other copy of the owner conversation.

Checks DA01-R1-AUTH-01's closure: are the "six extra checks" in owner-decisions-02 section 1 byte-identical
to the prompt that Claude Code session 9d3c2edb-f457-407e-b79c-f2b32b5cb4fd wrote for the implementer, and is
the "pre-approved" sentence from that same prompt? The transcript itself is private and is not committed;
only this comparison and its result are.

Usage: six_checks_compare.py <9d3c2edb-...jsonl> <owner-decisions-02.md>
"""
import json, sys

def texts(record):
    content = record.get('message', {}).get('content')
    if isinstance(content, str):
        yield content
    elif isinstance(content, list):
        for part in content:
            if part.get('type') == 'text':
                yield part['text']

lines = open(sys.argv[1], encoding='utf-8').read().splitlines()
hits = [(n, r) for n, r in ((n, json.loads(l)) for n, l in enumerate(lines, 1))
        if any('Beyond the brief, I specifically want you to check these' in t for t in texts(r))]
assert len(hits) == 1, f'expected one source record, found {len(hits)}'
line_no, record = hits[0]
source = '\n'.join(texts(record))
start = source.index('a) Threat model, item (a).')
end_marker = 'Turn that into a checklist for reviewers and briefs.'
end = source.index(end_marker) + len(end_marker)
owner = open(sys.argv[2], encoding='utf-8').read()
block_start = owner.index('```text\n') + len('```text\n')
block = owner[block_start:owner.index('```', block_start)].rstrip('\n')
print(json.dumps({
    'source_line': line_no,
    'source_timestamp': record.get('timestamp'),
    'source_role': record.get('message', {}).get('role'),
    'six_checks_chars': len(block),
    'six_checks_verbatim': block == source[start:end],
    'preapproval_sentence_in_same_prompt': 'The owner has pre-approved going straight on unless a question needs an' in source,
}, indent=1))
