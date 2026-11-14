#!/bin/sh
# Independent review 06 of K1.4: search of current pages at H for copies of the corrected claims.
# Run from the repository root: sh docs/development/work/K1.4/review-06/claim-search.sh
# Scope: Layer 1-3, guides, the numbered development pages, package sources and READMEs, skills, examples
# and the legacy mapping. Out of scope: docs/development/work/** (sealed or round records), research and
# package tests, which describe behaviour at their own revision.
H=64c505bfee13cae340710942e69fe805723aaad9
set -- mental-model docs/guides 'docs/development/0*.md' docs/development/kernel-ownership.md docs/development/README.md \
  packages README.md AGENTS.md .agents examples tests/conformance/legacy-mapping.json \
  ':!packages/*/tests' ':!packages/*/*/tests'
echo "## 1. Timer rule, by name: who makes a deadline take effect"
git grep -n -I -i -E 'take(s)? effect|never pump|pumps? timers|host fire|host-fire|fire-only|instant enforcement|next host call|at host calls|due at registration|already due|already expired|already passed' "$H" -- "$@" | sed -E 's/^[0-9a-f]{40}://' | cut -c1-260 | sed -E 's/[[:space:]]+$//'
echo "## 2. Timer rule, by alias: deadline, expiry and timers in guides, READMEs, skills and examples"
git grep -n -I -i -E 'deadline|expir|humanWait|timer' "$H" -- docs/guides 'packages/*/README.md' README.md .agents examples | sed -E 's/^[0-9a-f]{40}://' | cut -c1-260 | sed -E 's/[[:space:]]+$//'
echo "## 3. Timer rule, by alias: scheduler and host statements in the mental model"
git grep -n -I -i -E 'timer|no scheduler|scheduler of its own|in-process coordinator|when the host|the host (fires|decides|owns|pumps|drives)' "$H" -- mental-model | sed -E 's/^[0-9a-f]{40}://' | cut -c1-260 | sed -E 's/[[:space:]]+$//'
echo "## 4. Wrapper visibility (O-2)"
git grep -n -I -i -E 'internal SDK|SDK TypeScript wrapper|not a public SDK entry|owns that bridge|public entry|re-exports|toCanonicalBytes' "$H" -- mental-model docs/guides 'docs/development/0*.md' docs/development/kernel-ownership.md packages/sdk/README.md packages/sdk/src/index.ts packages/sdk/src/wrapper.ts packages/sdk/package.json .agents | sed -E 's/^[0-9a-f]{40}://' | cut -c1-260 | sed -E 's/[[:space:]]+$//'
echo "## 5. Anchors on the old or new doc-comment text in tests, scripts and evidence tools (only the two source lines may match)"
git grep -n -I -F -e 'deadlines take effect at host calls' -e 'Deadlines take effect at the next host call' -e 'Fires every timer due on the Kernel clock' -e 'takes effect at the next host' "$H" -- tests scripts packages 'docs/**/*.mjs' 'docs/**/*.py' 'docs/**/*.ts' 'docs/**/*.json' | sed -E 's/^[0-9a-f]{40}://' | cut -c1-260 | sed -E 's/[[:space:]]+$//'
