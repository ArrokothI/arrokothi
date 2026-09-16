# validation-02 manifest — digests of immutable raw logs for C2 fc3e450027bf2723a61784eb9d48c4c76f8a0377

Reviewer note: `test:kernel` and `test:conformance` are run here as a mechanical cross-check
on the no-executable-change claim, not as new gates — this packet changes no executable byte.
They ran on Node v25.2.1. On Node v22.22.3 two legacy Effect tests cancel (review-08 OP1,
reproduced by review-02); that is pre-existing at base B and is not claimed away here.

50d4ea74dbf7c570c92c242bcb3d74f7ce8403dcf80238337e9c4f9ff01cf943  00-scope-and-findings.log
77872bb1ab55f37391591492cbd5c85d3ae7ee34d0b1d97c3950c0c38ed6ea9b  01-builder-docs.log
a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be  02-typecheck.log
656f0745527f441c83929a7f76947420bac617a71adb4db4dcdbf2ec6649a876  03-test-kernel.log
348731fa3b62be0c7e57980ee17c65f68976903dcefccaa55b17e76e3ad23c02  04-test-conformance.log
