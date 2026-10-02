#!/usr/bin/env bash
# Reviewer: count mentions of accepted claims/decisions that the threat-model options would change,
# in the audit's register, decision drafts and other audit prose. Usage: claims_coverage.sh <packet-dir>
D="$1"
for t in 'decision-03' 'decision-04' 'decision-05' 'K1.4' 'cannot steer' 'One reading' 'Kernel-mediated' \
         'coherent-Proxy' 'ambient safety' 'DEC-8' 'DEC-9' 'single observation' 'stable-realm' 'Trusted' \
         'frozen-intrinsics' 'lockdown' 'ShadowRealm'; do
  printf '%-18s register:%s drafts:%s other:%s\n' "$t" \
    "$(grep -c -i -- "$t" "$D/register.md")" \
    "$(cat "$D"/decision-drafts/*.md | grep -c -i -- "$t")" \
    "$(cat "$D/review08-results.md" "$D/measurements.md" "$D/coordinator-map.md" "$D/implementation-01.md" | grep -c -i -- "$t")"
done
echo '--- values.md anchor cited by register A root choice (register.md:11):'
awk '/^## What these rules do not cover/{p=1} p&&/^## /&&!/What these rules/{exit} p' "$D/../../../../mental-model/concepts/values.md" | grep -n -i -E "process|contain|isolat" | cut -c1-200
echo '--- where values.md actually says it:'
grep -n -i -E 'do not contain code that shares the process|Protection against hostile' "$D/../../../../mental-model/concepts/values.md"
echo '--- whole-word SES (Hardened JavaScript) mentions:'
printf 'register:%s drafts:%s\n' "$(grep -c -w 'SES' "$D/register.md")" "$(cat "$D"/decision-drafts/*.md | grep -c -w 'SES')"
