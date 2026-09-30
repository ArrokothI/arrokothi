# Separate owner note — revision 9 review

The same evidence-enforcement defect family remains open across correction revisions 7, 8 and 9. Reviews 10 and 11 found that the checks recognized the selected regressions without establishing their claimed general result. This review finds a related mistake in the runtime replacement: the checker omits parts of the observable decision, and the declared control-exit coverage exceeds the actual scenarios.

Amendment 03's move to a finite runtime method is reasonable. I am **not** recommending a return to an impossible sound-analyzer requirement. The production repairs examined here work, including the refusal-index repair. The remaining problem is that the evidence's own oracle and path inventory have not received the same adversarial scrutiny as the implementation.

Please consider switching or escalating the implementation agent for the next correction, or assigning independent test-design scrutiny before another handoff. The useful focus is a finite acceptance oracle with explicit legal results, forbidden mutations and reachable schedules. Another round that only adds these particular probes without rebuilding that coverage model risks repeating the same conceptual error.

This note concerns H `4a917f8caac04e7d9861e0ec3638662d52f9d3ae` and its history. It does not judge the later revision-10 work observed on the branch. It is an owner communication, not an additional technical finding or a demand for another approval step.
