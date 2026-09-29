# Owner note — recurring enforcement defects after review 11

This is a separate note to the owner, outside the independent reviewer report. It concerns candidate
`dcac779bdf7e887bcf42c8a6407c1b24c2083a55` and [review 11](review-11.md).

The same substantive defect family has survived another correction round. Review 09 exposed the
inherited-read/history failure; review 10 showed that the proposed enforcement missed equivalent
reads and early mutations. Revision 8 now rejects those exact examples, but three new variants pass
all 1,411 maintained Kernel tests. They still permit an inherited callback during inspection or an
early acceptance-position mutation hidden until the next receipt.

The current production repair behaves correctly in the cases reviewed. The repeated conceptual
mistake is treating the analyzer's recognized examples as proof that every permitted form preserves
ownership and mutation provenance. Calling the analysis closed-world does not establish that proof.

Please consider switching or escalating the implementation agent before the next attempt, or having
the implementation approach reassessed by someone with static-analysis experience. The next attempt
should explain the accepted language and conservative treatment of every relevant binding/read/call
form before claiming mechanism-level closure. This is owner guidance, not a new mandatory reviewer
or a prescribed patch. The authoritative correction requirements are the two findings in review 11;
V-D1 remains transferred, and no architecture decision or successor release is requested.
