---
title: Linearity rules
description: The precise rules that make contexts linear, and the error each rule produces.
---

A variable of type `Ctx<M>` is **live** or **moved**. These rules apply, checked flow-sensitively along every path:

1. **Use moves.** Any mention of a context variable in an expression moves it (contexts have no non-consuming uses). Using a moved variable is `V0101`.
2. **Everything is consumed.** At the end of a scope, every context declared in it must be moved: dropped, returned, passed to a function, consumed by an operation, or committed. Otherwise `V0102`. Discarding a context-valued expression (`c ++ "x"` as a statement) or binding it to `_` is also `V0102`.
3. **No overwriting.** Assigning to or shadowing a context variable that is still live would leak it: `V0102`.
4. **Branches agree.** After `if`/`else`, every pre-existing context has the same state on both paths (`V0103`). A path that `return`s is excluded from the comparison.
5. **Loops are neutral.** A loop body leaves every outer context in the state it found it, including its labelled spans (`V0104`).
6. **No hidden copies.** A context can't be stored inside a value that is then bound to a single name, like `let t = (c, 1)` (`V0105`). Destructure instead: `let (c, x) = ...`. Contexts can't be printed.
7. **Models match.** Arguments, returns, and commits require the same model (`V0106`).
8. **Returns release.** At `return`, every context not being returned must already be consumed.
9. **Speculation is a transaction.** Inside `speculate`, outer contexts are frozen (`V0131`), every path ends in `commit`/`rollback` (`V0130`), `return` is forbidden (`V0132`), and contexts created inside are released automatically at the commit or rollback.

## Spans

Each context type also carries two label sets: **must** (labels definitely present) and **may** (labels possibly present).

- `c ++ #[l] text` requires `l ∉ may` (else `V0121`) and adds `l` to both.
- `splice c at l with ...` requires `l ∈ must` (else `V0120`) and removes `l` from both. `with #[k] ...` adds `k`.
- At joins (after `if`, speculation outcomes): must = intersection, may = union.
