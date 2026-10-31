---
title: 5. Speculation
description: Try a continuation transactionally with speculate, commit, and rollback.
---

`speculate` runs a block against a **tentative** version of a context. The block must end every path with either:

- `commit (ctx, value)`: keep the new context and return `value`, or
- `rollback value`: throw away everything the block did and return the original context with `value`.

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128 }

fn plausible(s: str<=64) -> bool {
  return len(s) > 10 && !contains(s, "TODO")
}

fn main() {
  let c = open llama ++ "Write a one-line fix for: off-by-one in loop bound."
  let (c, fix) = speculate c {
    let (c, attempt) = gen c ++ "\nFix:" max 64
    if plausible(attempt) { commit (c, attempt) } else { rollback "no fix" }
  }
  print(fix)
  drop c
}
```

The result type is `(Ctx<llama>, str<=64)`: the commit value `str<=64` joined with the rollback value `str<=6`.

## The rules

- Inside the block, the speculated context shares all of the original's cache: starting a speculation costs no memory.
- Every path must end in `commit` or `rollback` (`V0130`). Falling off the end would leave the transaction undecided.
- Contexts created inside the block are **released automatically** on commit (except the committed one) and on rollback. This is the one place you don't need `drop`.
- Other contexts from outside the block are **frozen** inside it (`V0131`), so a rollback really restores the exact prior state.
- `return` isn't allowed inside `speculate` (`V0132`).

## How the planner sees it

The planner explores both outcomes and joins them: the original stays resident while the block runs (it might be restored), so peak memory includes both. That matches what an engine with a transactional KV cache must hold, as in the speculative-decoding cache designs from [chapter 3](/learn/serving/).

Next: [6. Loops, functions, and budgets →](/tutorial/budgets/)
