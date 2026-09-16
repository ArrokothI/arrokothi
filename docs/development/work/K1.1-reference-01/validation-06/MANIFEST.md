# validation-06 manifest — digests of immutable raw logs for C6 2f1a7ced4ab0a4b340132899bd61fc14ae678a6d

Contract revision 5 scopes `git diff --check` to authored content and makes it mandatory every
round; `00-findings-and-scope.log` records it on C6 with a negative control proving the exclusion
does not hide authored whitespace. Runtime suites are not rerun: no executable byte differs A→C6.
Node v25.2.1 here; two legacy Effect tests cancel on Node v22.22.3 (OP1), pre-existing at B.
No all-supported-Node green claim is made.

91ccd930c371d3785e1c83827d4696631d90cc0f6a6366a9f860685ed1e92157  00-findings-and-scope.log
a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be  01-typecheck.log
42d94006d6acf2548161e8e1d6a9a3e18cdd12bfce4b1fd8f8e5ff2dd81dde5d  02-builder-docs.log
