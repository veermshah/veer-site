---
title: The planner
description: How the static planner computes sound bounds on KV memory, prefill, decode, and splice cost, and what it assumes.
---

The planner is an **abstract interpreter** ([background](/learn/type-systems/)) that runs after type checking. `veer check` plans `main` and every function with a `@budget`. `veer plan --entry f` plans any function.

## What it computes

| Output | Meaning |
|---|---|
| `peak KV memory` | max over all program points and paths of resident KV bytes (live segments, page-rounded, × bytes/token), including resident prefixes |
| `live at peak` | which contexts were live at the peak, their token counts, and how many are shared |
| `prefill tokens` | max over paths of prompt tokens prefilled: prefixes once, `++` text, BOS, splice replacement and tail |
| `decode tokens` | max over paths of tokens generated (sum of `max`) |
| `longest context` | longest any context can get, checked against `max_ctx` (`V0202`) |
| `fork` lines | tokens shared by each fork and the bytes saved versus copying |
| `splice` lines | worst-case re-prefill per splice (`W0210`) |
| `context DAG` | the sequence of context operations with input/output handles |
| `reuse_hints` (JSON) | for each shared segment, the steps at which it is used, for steps-to-execution eviction |

## How

- Strings become their static token bounds. Contexts become chains of segments with token bounds, reference-counted like the runtime store.
- `if` with an unknown condition: both branches run on copies of the state, then **join**: identical contexts stay identical, differing ones keep their common prefix plus one segment as large as the larger remainder. Counters take the max.
- `for i in 0..N`: unrolled N times (N is a constant). `for x in list` (unknown length ≤ N): the states after 0, 1, …, N iterations are joined.
- Calls are inlined. `return`, `commit` and `rollback` outcomes are collected and joined.
- `splice` allocates the new chain *before* releasing the old one, so the transient double occupancy is counted.

## Soundness

**Claim:** for every execution of a well-typed program, on an engine that implements Veer's [memory model](/reference/contexts/), measured peak KV bytes ≤ planned, measured prefill ≤ planned, measured decode ≤ planned, and nothing is left resident at the end besides prefixes.

**Evidence:** `crates/veer-runtime/tests/plan_soundness.rs` checks this on 400 random programs per run (forks, branches, loops, splices, speculation, four KV formats, four page sizes) against the simulated engine, which implements the memory model exactly. A test that plants a deliberate under-estimate makes it fail.

## Assumptions

1. **Token measure.** Tokens ≤ UTF-8 bytes. This is sound for byte-level BPE tokenizers. It assumes tokenizing a concatenation doesn't produce more tokens than tokenizing the pieces separately, which holds in practice for BPE.
2. **Memory model.** Each segment occupies whole pages. Engines that pack segments more tightly use less.
3. **Tool and model output** is bounded by the declared types (enforced by `max` and by truncation of tool results).
4. **Plans are per program.** Memory used by other tenants of the same engine isn't included.
