---
title: "Many questions over one document"
description: "Veer cookbook: many questions over one document."
sidebar:
  order: 4
---

Retrieval-augmented QA where the retrieved document is prefilled once and each question forks from it inside a helper function that takes and returns the context.

File: `examples/rag.veer` (included in every [release download](/download/))

```veer
// Many questions over one retrieved document: the document is prefilled once
// and every question forks from it.
model mistral = "mistralai/Mistral-7B-Instruct-v0.3" { layers: 32, kv_heads: 8, head_dim: 128, kv: fp8_e4m3 }

prefix SYS: mistral = "Answer strictly from the provided document."

tool retrieve(topic: str<=64) -> str<=3000

fn ask(doc_ctx: Ctx<mistral>, q: str<=200) -> (Ctx<mistral>, str<=160) {
  let (keep, branch) = fork doc_ctx
  let (branch, a) = gen branch ++ "\nQ: " ++ q ++ "\nA:" max 160
  drop branch
  return (keep, a)
}

@budget(kv = 768MiB)
fn main() {
  let doc = retrieve("paged attention")
  let c = open SYS ++ "\n" ++ doc
  let (c, a1) = ask(c, "What problem does paging solve?")
  let (c, a2) = ask(c, "What is the block size trade-off?")
  let (c, a3) = ask(c, "How does copy-on-write work here?")
  print(a1)
  print(a2)
  print(a3)
  drop c
}
```

## Static plan

```text
$ veer plan examples/rag.veer --entry main
plan for `main`
  model mistral    kv=fp8_e4m3 · 64.00 KiB/token · page 16 tok
  peak KV memory    217.00 MiB  (budget 768.00 MiB ✓)  at line 11
  live at peak      branch (3,412 tok, 3,045 shared), c (3,045 tok, 3,045 shared)
  resident prefixes 3.00 MiB
  prefill tokens    ≤ 3,666
  decode tokens     ≤ 480
  longest context   ≤ 3,412 tokens (mistral)
  fork  line 10    shares 3,045 tokens, saves 192.00 MiB vs copying
  context DAG (first 22 of 22 ops):
      0  L19   open                   -> c2           prefix SYS
      1  L19   append              c2 -> c4           1 tok 
      2  L19   append              c4 -> c6           3,000 tok 
      3  L10   fork                c6 -> c7,c8        
      4  L11   append              c8 -> c10          4 tok 
      5  L11   append             c10 -> c12          200 tok 
      6  L11   append             c12 -> c14          3 tok 
      7  L11   gen                c14 -> c16          160 tok max 160
      8  L12   drop               c16 ->              3,412 tok 
      9  L10   fork                c7 -> c17,c18      
     10  L11   append             c18 -> c20          4 tok 
     11  L11   append             c20 -> c22          200 tok 
     12  L11   append             c22 -> c24          3 tok 
     13  L11   gen                c24 -> c26          160 tok max 160
     14  L12   drop               c26 ->              3,412 tok 
     15  L10   fork               c17 -> c27,c28      
     16  L11   append             c28 -> c30          4 tok 
     17  L11   append             c30 -> c32          200 tok 
     18  L11   append             c32 -> c34          3 tok 
     19  L11   gen                c34 -> c36          160 tok max 160
     20  L12   drop               c36 ->              3,412 tok 
     21  L26   drop               c27 ->              3,045 tok 
  reuse hints       seg1 (prefix, 44 tok) used at steps [0, 1, 2, 3, 4, 5, 6, 7]
                    seg3 (text, 1 tok) used at steps [1, 2, 3, 4, 5, 6, 7, 9]
                    seg5 (text, 3000 tok) used at steps [2, 3, 4, 5, 6, 7, 9, 10]
                    seg9 (text, 4 tok) used at steps [4, 5, 6, 7]
                    seg11 (text, 200 tok) used at steps [5, 6, 7]
                    seg13 (text, 3 tok) used at steps [6, 7]
```

## Simulated run

```text
$ veer run examples/rag.veer --stats
the bug page bug context fast bug test page memory review draft yes value model context
summary draft result memory value summary shared fix memory plan plan yes prefix patch bug the yes
reply the check block fast draft page shared value no bug value fix fix agent prefix block memory agent summary reply

── engine: sim ──
  peak KV               20.00 MiB   planned ≤ 217.00 MiB     ✓
  prefill tokens              201   planned ≤ 3666           ✓
  decode tokens               302   planned ≤ 480            ✓
  reused tokens               293
  gen calls                     3
```

## Notes

- `fn ask(doc_ctx: Ctx<mistral>, q: str<=200) -> (Ctx<mistral>, str<=160)` shows linearity through function calls: the context goes in and comes back.
- Each `ask` shares the up-to-3,000-token document instead of re-prefilling it: total prefill is ≤ 3,666 tokens, where three independent requests would prefill the document three times.
- `kv: fp8_e4m3` halves bytes per token compared to bf16.
