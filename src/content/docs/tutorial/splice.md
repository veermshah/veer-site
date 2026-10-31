---
title: 4. Editing contexts with splice
description: Label spans of a context and replace them in place, with the re-prefill cost visible at compile time.
---

Agents need to edit their history: drop a large tool output once it has been digested, or replace a draft with a final version. ([Why editing is expensive](/learn/agents/).)

## Labelling a span

`#[name]` labels the text appended by one `++`:

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128 }
tool search(q: str<=64) -> str<=2048

fn main() {
  let obs = search("flaky cache test")
  let c = open llama ++ "Observation: " ++ #[obs] obs
  let (c, note) = gen c ++ "\nTakeaway:" max 40
  let c = splice c at obs with "(observation summarized)"
  let (c, next) = gen c ++ "\nNext action:" max 40
  print(note, next)
  drop c
}
```

The type of `c` records which spans it contains, so:

- `splice c at obs` is accepted, because `obs` is definitely present.
- Splicing a span that isn't there is `V0120`. After a splice the label is **gone** (the replacement is unlabelled), so splicing `obs` twice is also `V0120`. To label the replacement, write `splice c at obs with #[summary] "..."`.
- Adding a label that may already exist is `V0121`, so edits are never ambiguous.

## The cost of an edit

Everything *after* a spliced span must be re-prefilled, because cached keys depend on position ([RoPE](/learn/kv-cache/)). The planner computes the worst case and warns:

```text
warning[W0210]: splicing `obs` re-prefills up to 50 following tokens
```

Here that is `"\nTakeaway:"` (10 bytes, so ≤ 10 tokens) plus the ≤ 40 generated. Splice right after the information is used and the cost is small; splice a span from the beginning of a long conversation and the warning tells you it will re-prefill thousands of tokens. Engines that support position-corrected KV editing (as Leyline proposes) could avoid the cost entirely, and the plan still tells you which spans are affected.

## Splicing in a loop

Loops must not accumulate labels (a label added in iteration 1 would be duplicated in iteration 2, `V0104`). Label, use, splice away, all within one iteration:

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128 }
tool search(q: str<=64) -> str<=2048

fn main() {
  let c = open llama ++ "Task: debug the flaky test.\n"
  for step in 0..3 {
    let (c2, q) = gen c ++ "\nQuery:" max 24 stop "\n"
    let c3 = c2 ++ "\nResult: " ++ #[obs] search(q)
    let (c4, note) = gen c3 ++ "\nTakeaway:" max 40
    c = splice c4 at obs with "(result summarized)"
  }
  drop c
}
```

The context grows by about 100 tokens per step instead of 2,000. See `examples/agent_edit_history.veer` for a full version with a memory budget.

Next: [5. Speculation →](/tutorial/speculate/)
