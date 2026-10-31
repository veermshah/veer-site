---
title: "Code review with sharing, editing, and speculation"
description: "Veer cookbook: code review with sharing, editing, and speculation."
sidebar:
  order: 1
---

A reviewer that reads a document once, branches into a summary and a structured bug list that share the document's KV cache, edits the document out of the cache with `splice`, and tries a patch inside a `speculate` transaction. It uses every context feature in about 30 lines.

File: `examples/review.veer` (included in every [release download](/download/))

```veer
// Code review with a shared document prefix, structured output, an in-place
// edit of the context (splice), and a transactional speculative patch.
model llama = "meta-llama/Llama-3.1-8B-Instruct" {
  layers: 32, kv_heads: 8, head_dim: 128, kv: fp8_e4m3, block: 16, max_ctx: 131072
}

prefix SYS: llama = "You are a careful senior code reviewer. Be concise."

schema Bugs {
  count: int,
  items: [str<=80; <=8],
}

fn looks_valid(patch: str<=64) -> bool {
  return contains(patch, "fix") || len(patch) > 8
}

@budget(kv = 2GiB, prefill = 12000)
fn review(doc: str<=4096) -> str<=384 {
  let c = open SYS ++ "\n<document>\n" ++ #[doc] doc ++ "\n</document>\n"
  let (a, b) = fork c                       // both branches share SYS + doc (no copy)
  let (a, summary) = gen a ++ "Summarize the change:" max 128
  drop a
  let (b, bugs) = gen b ++ "List the bugs as JSON:" max 256 as json<Bugs>
  // The document is no longer needed in b's context: replace it in place.
  let b = splice b at doc with "<document elided>"
  let (b, patch) = speculate b {
    let (b, p) = gen b ++ "Propose a one-line patch:" max 64
    if looks_valid(p) { commit (b, p) } else { rollback "no patch" }
  }
  drop b
  return summary + " | patch: " + patch
}

fn main() {
  let out = review("fn add(a: i32, b: i32) -> i32 { a - b }  // adds two numbers")
  print(out)
}
```

## Static plan

```text
$ veer plan examples/review.veer --entry main
plan for `main`
  model llama      kv=fp8_e4m3 · 64.00 KiB/token · page 16 tok · max_ctx 131,072
  peak KV memory    301.00 MiB  at line 26
  live at peak      b (372 tok, 64 shared), b (4,451 tok, 64 shared)
  resident prefixes 4.00 MiB
  prefill tokens    ≤ 4,549
  decode tokens     ≤ 448
  longest context   ≤ 4,451 tokens (llama)
  fork  line 21    shares 4,173 tokens, saves 262.00 MiB vs copying
  splice line 26   at `doc` re-prefills ≤ 291 tokens
  context DAG (first 17 of 17 ops):
      0  L20   open                   -> c2           prefix SYS
      1  L20   append              c2 -> c4           12 tok 
      2  L20   append              c4 -> c6           4,096 tok #[doc]
      3  L20   append              c6 -> c8           13 tok 
      4  L21   fork                c8 -> c9,c10       
      5  L22   append              c9 -> c12          21 tok 
      6  L22   gen                c12 -> c14          128 tok max 128
      7  L23   drop               c14 ->              4,322 tok 
      8  L24   append             c10 -> c16          22 tok 
      9  L24   gen                c16 -> c18          256 tok max 256
     10  L26   splice             c18 -> c23          308 tok at doc (+291 re-prefill)
     11  L27   speculate          c23 -> c24          
     12  L28   append             c24 -> c26          25 tok 
     13  L28   gen                c26 -> c28          64 tok max 64
     14  L29   commit             c23 -> c28          
     15  L29   rollback               -> c23          
     16  L31   drop               c30 ->              461 tok 
  reuse hints       seg1 (prefix, 52 tok) used at steps [0, 1, 2, 3, 4, 5, 6, 8]
                    seg3 (text, 12 tok) used at steps [1, 2, 3, 4, 5, 6, 8, 9]
                    seg5 (text, 4096 tok) used at steps [2, 3, 4, 5, 6, 8, 9]
                    seg7 (text, 13 tok) used at steps [3, 4, 5, 6, 8, 9]
                    seg11 (text, 21 tok) used at steps [5, 6]
                    seg15 (text, 22 tok) used at steps [8, 9]

warning[W0210]: splicing `doc` re-prefills up to 291 following tokens
  --> examples/review.veer:26:11
   |
26 |   let b = splice b at doc with "<document elided>"
   |           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 
   = note: engines with position-corrected KV editing (Leyline-style) can avoid this; splice near the end to avoid it everywhere
   = help: run `veer explain W0210` for details
```

## Simulated run

```text
$ veer run examples/review.veer --stats
patch prefix model context model fix no bug plan context prefix result yes result no draft model maybe | patch: fast yes result maybe review result bug cache

── engine: sim ──
  peak KV               21.00 MiB   planned ≤ 301.00 MiB     ✓
  prefill tokens              279   planned ≤ 4549           ✓
  decode tokens               169   planned ≤ 448            ✓
  reused tokens               327
  gen calls                     3
```

## Notes

- `fork` shares the system prompt and the whole 4,096-token document between the two branches. The plan shows how much memory that saves.
- `as json<Bugs>` returns a typed record. The checker proves the smallest valid `Bugs` fits in 256 tokens.
- `splice b at doc` removes the document from `b`'s cache once it's no longer needed. `W0210` reports the worst-case re-prefill of what followed it.
- `speculate` keeps the original context alive until the patch is accepted (`commit`) or rejected (`rollback`).
- `@budget(kv = 2GiB, prefill = 12000)` is checked at compile time.
