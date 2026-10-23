/** Test composition of independent SDK captures. It creates no Kernel decision or refusal record. */
import { canonicalize } from '../src/internal/value-capture.ts';
import { appendRootIssues, explainDiagnosticIssues, type LocatedIssue } from '../../kernel/src/envelope.ts';
export function captureWrapperRoots(roots: readonly (readonly [string, unknown])[]) {
  const issues: LocatedIssue[] = [];
  let acceptedRoots = 0;
  for (const [label, value] of roots) {
    const result = canonicalize(value);
    if (result.ok) acceptedRoots++;
    else appendRootIssues(issues, result.issues as never, label);
  }
  return { issues, acceptedRoots, diagnostic: explainDiagnosticIssues(issues, true) };
}
export function outcomeWrapperRoots(proposal: any) {
  const roots: [string,unknown][] = [['progress',proposal.progress]];
  for (let index = 0; index < (proposal.emissions?.length ?? 0); index++) roots.push([`emissions[${index}].value`,proposal.emissions[index].value]);
  if (proposal.next?.step === 'complete') roots.push(['next.result',proposal.next.result]);
  if (proposal.next?.step === 'fail') roots.push(['next.error',proposal.next.error]);
  return captureWrapperRoots(roots);
}
