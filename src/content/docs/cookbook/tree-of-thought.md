---
title: "Tree-of-thought search"
description: "Veer cookbook: tree-of-thought search."
sidebar:
  order: 3
---

Breadth-limited tree search over a shared problem statement: each level forks `WIDTH` branches from the root, generates a thought, and judges it with a constrained `choice`.

File: `examples/tree_of_thought.veer` (included in every [release download](/download/))

```veer
// Tree of thought: one shared problem prefix, WIDTH branches explored
// level by level, each judged with a constrained choice.
model qwen = "Qwen/Qwen2.5-7B-Instruct" { layers: 28, kv_heads: 4, head_dim: 128, kv: bf16 }

prefix TASK: qwen = "Problem: schedule 5 jobs on 2 machines to minimize makespan. Think step by step."

const WIDTH = 3
const DEPTH = 2

@budget(kv = 512MiB)
fn main() {
  let best: str<=96 = ""
  let root = open TASK
  for level in 0..DEPTH {
    for i in 0..WIDTH {
      let (keep, branch) = fork root
      root = keep
      let (branch, thought) = gen branch ++ "\nNext step:" max 96
      let (branch, verdict) = gen branch ++ "\nIs this step promising?" max 4 as choice["yes", "no"]
      if verdict == "yes" { best = thought }
      drop branch
    }
    let (r, step) = gen root ++ "\nCommit to the best step:" max 64
    root = r
  }
  print("best thought:", best)
  drop root
}
```

## Static plan

```text
$ veer plan examples/tree_of_thought.veer --entry main
plan for `main`
  model qwen       kv=bf16 · 56.00 KiB/token · page 16 tok
  peak KV memory    19.25 MiB  (budget 512.00 MiB ✓)  at line 19
  live at peak      branch (305 tok, 170 shared), root (170 tok, 170 shared)
  resident prefixes 5.25 MiB
  prefill tokens    ≤ 341
  decode tokens     ≤ 728
  longest context   ≤ 305 tokens (qwen)
  fork  line 16    shares 170 tokens, saves 10.50 MiB vs copying
  context DAG (first 24 of 42 ops):
      0  L13   open                   -> c2           prefix TASK
      1  L16   fork                c2 -> c3,c4        
      2  L18   append              c4 -> c6           11 tok 
      3  L18   gen                 c6 -> c8           96 tok max 96
      4  L19   append              c8 -> c10          24 tok 
      5  L19   gen                c10 -> c12          4 tok max 4
      6  L21   drop               c12 ->              216 tok 
      7  L16   fork                c3 -> c13,c14      
      8  L18   append             c14 -> c16          11 tok 
      9  L18   gen                c16 -> c18          96 tok max 96
     10  L19   append             c18 -> c20          24 tok 
     11  L19   gen                c20 -> c22          4 tok max 4
     12  L21   drop               c22 ->              216 tok 
     13  L16   fork               c13 -> c23,c24      
     14  L18   append             c24 -> c26          11 tok 
     15  L18   gen                c26 -> c28          96 tok max 96
     16  L19   append             c28 -> c30          24 tok 
     17  L19   gen                c30 -> c32          4 tok max 4
     18  L21   drop               c32 ->              216 tok 
     19  L23   append             c23 -> c34          25 tok 
     20  L23   gen                c34 -> c36          64 tok max 64
     21  L16   fork               c36 -> c37,c38      
     22  L18   append             c38 -> c40          11 tok 
     23  L18   gen                c40 -> c42          96 tok max 96
  reuse hints       seg1 (prefix, 81 tok) used at steps [0, 1, 2, 3, 4, 5, 7, 8]
                    seg5 (text, 11 tok) used at steps [2, 3, 4, 5]
                    seg7 (gen, 96 tok) used at steps [3, 4, 5]
                    seg9 (text, 24 tok) used at steps [4, 5]
                    seg15 (text, 11 tok) used at steps [8, 9, 10, 11]
                    seg17 (gen, 96 tok) used at steps [9, 10, 11]
```

## Simulated run

```text
$ veer run examples/tree_of_thought.veer --stats
best thought: tool prefix maybe shared draft tool test context bug tool the check maybe fix yes yes

── engine: sim ──
  peak KV               19.25 MiB   planned ≤ 19.25 MiB      ✓
  prefill tokens              341   planned ≤ 341            ✓
  decode tokens               607   planned ≤ 728            ✓
  reused tokens               819
  gen calls                    14
```

## Notes

- `fork root` + `root = keep` is the idiom for branching repeatedly from one context.
- `as choice["yes", "no"]` constrains the verdict. Its type is `str<=3`.
- Loops have constant bounds (`DEPTH`, `WIDTH`), so the planner unrolls them and proves the 512 MiB budget.
