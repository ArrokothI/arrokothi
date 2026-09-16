# validation-05 manifest — digests of immutable raw logs for C5 e1eb5888af6bda071bc57e5aa417bc2496533ccd

Round 5 changes one documentation artifact (the packet contract) and no mental-model or
executable byte, printed in `00-final-check.log`. Runtime suites are not rerun for that reason;
the full gate was run at H4 and is recorded in the round-5 handoff. Node v25.2.1 here; two legacy
Effect tests cancel on Node v22.22.3 (review-08 OP1, reproduced by review-02/03/04), pre-existing
at original B. No all-supported-Node green claim is made.

09f8a28d5c61a9dbb55d2b728bb238f5abccd9467d54aaede078b82b4bb2a31c  00-final-check.log
a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be  01-typecheck.log
42d94006d6acf2548161e8e1d6a9a3e18cdd12bfce4b1fd8f8e5ff2dd81dde5d  02-builder-docs.log
