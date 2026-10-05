# TOOLS-01 gate design 01 — area map and area derivation

2026-10-05. Claude Code (`claude-opus-5-5`), implementer. Owner choice 04 §3 asks for this note
before the gate is built. It is reviewed in the final independent review, not in a separate check.

## Area map

`adoption.json` `areas` is an ordered list of `{id, globs}`. A path's area is the first area with a
matching glob: `**` matches any characters, `*` any characters except `/`. The last area, `other`,
has the glob `**`, so every path in the tree has exactly one area. `corpus` checks this at C: IDs are
unique, every glob is used by at least one path at C, and no area is empty except `other`.

The areas, most specific first:

| Area IDs | Globs |
|---|---|
| `tooling` | `scripts/packet_tools.py`, `tests/tooling/**`, `tests/fixtures/packet-tools/**` |
| one per workspace package | `packages/<path>/**`, for each `package.json` under `packages/` |
| `packages` | `packages/**` |
| one per conformance suite | `tests/conformance/<suite>/**` |
| one per other test directory | `tests/<dir>/**` |
| one per packet record directory | `docs/development/work/<packet>/**` |
| one per other `docs/` or `docs/development/` entry | that file, or that directory `/**` |
| `mental-model`, `scripts`, `examples` | `<dir>/**` |
| one per root file | the file |
| `other` | `**` |

## Derivation of an open origin's areas

This applies to every origin that is `pending` or `pending_revalidation`, and to every
`prose_pending` record, which stores its areas.

1. Text: the origin's minimum context, as `context_minimum` returns it. That is the whole file for a
   line-1 artifact, and the heading section for a fence or a mention.
2. Names:
   - every repository path in that text: the `docs|packages|tests|scripts|examples|mental-model` path
     tokens, after stripping `:line` suffixes and fragments;
   - relative Markdown destinations, resolved against the origin's file;
   - root file names (`AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `package-lock.json`);
   - the origin's own path when it is outside `docs/`;
   - the files its revision-2 mapping names (`suite.<path>`).
3. A name's areas are the areas of every path at C that equals it or lies under it. A glob is cut at
   its first `*`. A name matching no path takes the area its own spelling matches.
4. The origin's areas are the union. If step 2 yields no name, the areas cannot be derived, and the
   origin has every area.

This over-includes. A directory, glob or root manifest name brings in every area under it, and a
section that names no path is gated by every change. Nothing reads meaning: the derivation is
lexical and is recomputed at C on each run, so new files cannot leave stale stored areas.

## Gate

`verify` runs the gate after its checks, whatever its spec lists. It reads the packet's
`verification.json`, named by the verify spec's `candidate` field; `verify` refuses a spec that lacks
it. Touched areas are the areas of B..C's changed paths plus the declared administrative files: F1
limits C..H to exactly those files. The gate fails when a touched area contains an open origin or a
`prose_pending` record, and it lists each such origin with its areas.
