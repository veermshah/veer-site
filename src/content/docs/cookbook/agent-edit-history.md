---
title: "Agent loop with KV editing"
description: "Veer cookbook: agent loop with kv editing."
sidebar:
  order: 2
---

A three-step debugging agent whose tool returns up to 2,048 tokens per call. After each step the observation is replaced in the cache by a short note, in the style of Leyline's KV directives, so the context grows by about 100 tokens per step instead of 2,000.

File: `examples/agent_edit_history.veer` (included in every [release download](/download/))

```veer
// An agent loop whose tool outputs are large. After each step the bulky
// observation is replaced by a short note *in the KV cache* (splice), so the
// context stays small, the way Leyline-style KV editing proposes.
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128, kv: bf16, max_ctx: 32768 }

prefix AGENT: llama = "You are a debugging agent. Use the search tool, then answer."

tool search(query: str<=128) -> str<=2048

@budget(kv = 1GiB, prefill = 20000)
fn main() {
  let c = open AGENT ++ "\nTask: find why the cache test is flaky.\n"
  for step in 0..3 {
    let (c2, q) = gen c ++ "\nSearch query:" max 32 stop "\n"
    let obs = search(q)
    let c3 = c2 ++ "\nObservation: " ++ #[obs] obs
    let (c4, note) = gen c3 ++ "\nOne-line takeaway:" max 48
    // Keep the takeaway, drop the 2 KB observation from the cache.
    c = splice c4 at obs with "(observation summarized)"
    print("step", step, "->", note)
  }
  let (c, answer) = gen c ++ "\nFinal answer:" max 128
  print(answer)
  drop c
}
```

## Static plan

```text
$ veer plan examples/agent_edit_history.veer --entry main
plan for `main`
  model llama      kv=bf16 · 128.00 KiB/token · page 16 tok · max_ctx 32,768
  peak KV memory    346.00 MiB  (budget 1.00 GiB ✓)  at line 19
  live at peak      c (555 tok, 464 shared), c4 (2,579 tok, 464 shared)
  resident prefixes 8.00 MiB
  prefill tokens    ≤ 6,674  (budget 20,000 ✓)
  decode tokens     ≤ 368
  longest context   ≤ 2,579 tokens (llama)
  splice line 19   at `obs` re-prefills ≤ 67 tokens
  context DAG (first 24 of 26 ops):
      0  L12   open                   -> c2           prefix AGENT
      1  L12   append              c2 -> c4           41 tok 
      2  L14   append              c4 -> c6           14 tok 
      3  L14   gen                 c6 -> c8           32 tok max 32
      4  L16   append              c8 -> c10          14 tok 
      5  L16   append             c10 -> c12          2,048 tok #[obs]
      6  L17   append             c12 -> c14          19 tok 
      7  L17   gen                c14 -> c16          48 tok max 48
      8  L19   splice             c16 -> c20          91 tok at obs (+67 re-prefill)
      9  L14   append             c20 -> c22          14 tok 
     10  L14   gen                c22 -> c24          32 tok max 32
     11  L16   append             c24 -> c26          14 tok 
     12  L16   append             c26 -> c28          2,048 tok #[obs]
     13  L17   append             c28 -> c30          19 tok 
     14  L17   gen                c30 -> c32          48 tok max 48
     15  L19   splice             c32 -> c36          91 tok at obs (+67 re-prefill)
     16  L14   append             c36 -> c38          14 tok 
     17  L14   gen                c38 -> c40          32 tok max 32
     18  L16   append             c40 -> c42          14 tok 
     19  L16   append             c42 -> c44          2,048 tok #[obs]
     20  L17   append             c44 -> c46          19 tok 
     21  L17   gen                c46 -> c48          48 tok max 48
     22  L19   splice             c48 -> c52          91 tok at obs (+67 re-prefill)
     23  L22   append             c52 -> c54          14 tok 
  reuse hints       seg1 (prefix, 61 tok) used at steps [0, 1, 2, 3, 4, 5, 6, 7]
                    seg3 (text, 41 tok) used at steps [1, 2, 3, 4, 5, 6, 7, 8]
                    seg5 (text, 14 tok) used at steps [2, 3, 4, 5, 6, 7, 8, 9]
                    seg7 (gen, 32 tok) used at steps [3, 4, 5, 6, 7, 8, 9, 10]
                    seg9 (text, 14 tok) used at steps [4, 5, 6, 7, 8, 9, 10, 11]
                    seg11 (text, 2048 tok) used at steps [5, 6, 7]

warning[W0210]: splicing `obs` re-prefills up to 67 following tokens
  --> examples/agent_edit_history.veer:19:9
   |
19 |     c = splice c4 at obs with "(observation summarized)"
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 
   = note: engines with position-corrected KV editing (Leyline-style) can avoid this; splice near the end to avoid it everywhere
   = help: run `veer explain W0210` for details
```

## Simulated run

```text
$ veer run examples/agent_edit_history.veer --stats
step 0 -> bug memory memory reply context agent memory
step 1 -> no no no draft page review page yes
step 2 -> memory prefix check review reply plan summary
block maybe shared fix yes reply agent draft reply bug agent no

── engine: sim ──
  peak KV               96.00 MiB   planned ≤ 346.00 MiB     ✓
  prefill tokens              638   planned ≤ 6674           ✓
  decode tokens               252   planned ≤ 368            ✓
  reused tokens                61
  gen calls                     7
```

## Notes

- Planned with the splice: **peak 346 MiB, longest context 2,579 tokens, prefill ≤ 6,674**.
- The same program without the splice plans at **peak 854 MiB, longest context 6,769 tokens, prefill ≤ 6,401**. The splice trades about 270 tokens of re-prefill for 2.5× less memory, and both numbers are known before running.
- The label `obs` is added and spliced away within each iteration, which is what the loop rule (`V0104`) requires.
- Bind the tool to a real command with `--tool search='./search.sh'`.
