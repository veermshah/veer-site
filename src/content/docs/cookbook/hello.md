---
title: "Hello, Veer"
description: "Veer cookbook: hello, veer."
sidebar:
  order: 6
---

The smallest complete program, also used in the [Quickstart](/start/quickstart/).

File: `examples/hello.veer` (included in every [release download](/download/))

```veer
// The smallest Veer program: open a context, generate, release it.
model tiny = "Qwen/Qwen2.5-0.5B-Instruct" { layers: 24, kv_heads: 2, head_dim: 64, kv: bf16 }

fn main() {
  let c = open tiny ++ "Say hello to Veer in five words:"
  let (c, reply) = gen c max 16
  print(reply)
  drop c
}
```

## Static plan

```text
$ veer plan examples/hello.veer --entry main
plan for `main`
  model tiny       kv=bf16 · 12.00 KiB/token · page 16 tok
  peak KV memory    768.00 KiB  at line 6
  live at peak      c (49 tok)
  prefill tokens    ≤ 33
  decode tokens     ≤ 16
  longest context   ≤ 49 tokens (tiny)
  context DAG (first 4 of 4 ops):
      0  L5    open                   -> c2           1 tok model tiny
      1  L5    append              c2 -> c4           32 tok 
      2  L6    gen                 c4 -> c6           16 tok max 16
      3  L8    drop                c6 ->              49 tok 
  reuse hints       seg1 (bos, 1 tok) used at steps [0, 1, 2]
                    seg3 (text, 32 tok) used at steps [1, 2]
```

## Simulated run

```text
$ veer run examples/hello.veer --stats
context maybe

── engine: sim ──
  peak KV              768.00 KiB   planned ≤ 768.00 KiB     ✓
  prefill tokens               33   planned ≤ 33             ✓
  decode tokens                13   planned ≤ 16             ✓
  reused tokens                 0
  gen calls                     1
```




