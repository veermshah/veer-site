---
title: 6. Loops, functions, and budgets
description: Bounded loops, functions that take and return contexts, and compile-time memory and prefill budgets.
---

## Loops have static trip counts

```veer
const STEPS = 4
```

`for i in 0..STEPS` (constants or literals only) or `for x in list` (a bounded list) are the only loops. A loop over a runtime value is `V0113`. This is the price of a static memory bound, and agent loops almost always have a step limit anyway.

To change a context in a loop, consume and re-assign it. The loop body must leave outer contexts as it found them (`V0104`):

```veer
model m = "x" { layers: 4, kv_heads: 2, head_dim: 64 }
fn main() {
  let c = open m
  for i in 0..3 {
    let (d, s) = gen c ++ "\nStep:" max 32
    c = d
  }
  drop c
}
```

## Functions

Functions can take contexts and return them. Linearity flows through calls: passing a context moves it.

```veer
model mistral = "mistralai/Mistral-7B-Instruct-v0.3" { layers: 32, kv_heads: 8, head_dim: 128, kv: fp8_e4m3 }

fn ask(doc: Ctx<mistral>, q: str<=200) -> (Ctx<mistral>, str<=160) {
  let (keep, branch) = fork doc
  let (branch, a) = gen branch ++ "\nQ: " ++ q ++ "\nA:" max 160
  drop branch
  return (keep, a)
}

fn main() {
  let c = open mistral ++ "Paged attention splits the KV cache into fixed-size blocks."
  let (c, a1) = ask(c, "What is split?")
  let (c, a2) = ask(c, "Into what?")
  print(a1, a2)
  drop c
}
```

Recursion is not allowed (`V0114`). The planner inlines calls to follow every cache.

## Budgets

`@budget` turns the plan into a compile-time contract:

```veer
model big = "x" { layers: 80, kv_heads: 8, head_dim: 128, kv: bf16 }

@budget(kv = 256MiB)
fn main() {   // error[V0200]
  let c = open big
  let (c, essay) = gen c ++ "Write a long essay." max 4000
  drop c
}
```

```text
error[V0200]: worst-case KV memory 1.24 GiB exceeds the budget of 256.00 MiB
  ::: ... peak reached here
   = note: live at peak: c (4020 tokens)
```

Budget keys:

| key | unit | checks |
|---|---|---|
| `kv` | bytes (`B`, `KiB`, `MiB`, `GiB`, `KB`, `MB`, `GB`) | worst-case peak resident KV cache, including prefixes |
| `prefill` | tokens | worst-case prompt tokens prefilled, including splice re-prefill |

Budgets are checked by `veer check`, `veer plan` and `veer run`, so a program that would exceed its budget never runs.

Next: [7. Precision types →](/tutorial/precision/)
