---
title: 2. Forking and sharing
description: Share a prefix between branches with fork and prefix declarations, and see the savings in the plan.
---

## fork

`fork c` consumes one context and returns **two** that share every token `c` had. The shared part is stored once (see [identical prefixes give identical caches](/learn/kv-cache/)):

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128 }

fn main() {
  let doc: str<=2000 = "...a long document..."
  let c = open llama ++ doc
  let (a, b) = fork c
  let (a, summary) = gen a ++ "\nSummary:" max 100
  let (b, title) = gen b ++ "\nTitle:" max 12
  print(title, "-", summary)
  drop a, b
}
```

`veer plan` reports the sharing:

```text
  fork  line 6     shares 2,001 tokens, saves 252.00 MiB vs copying
```

## Prefixes

A `prefix` is a context root that lives for the whole program and is shared by everything opened from it, such as a system prompt:

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128 }
prefix SYS: llama = "You are a terse assistant."

fn main() {
  let a = open SYS ++ "Q: capital of France?"
  let b = open SYS ++ "Q: capital of Japan?"
  let (a, x) = gen a max 8
  let (b, y) = gen b max 8
  print(x, y)
  drop a, b
}
```

The prefix is prefilled once, counted once in memory (`resident prefixes` in the plan), and never dropped.

## Fork in a loop

To branch many times from one root, fork and keep one half:

```veer
model qwen = "Qwen/Qwen2.5-7B-Instruct" { layers: 28, kv_heads: 4, head_dim: 128 }
prefix TASK: qwen = "Propose a name for a KV-cache-aware programming language."

fn main() {
  let root = open TASK
  for i in 0..4 {
    let (keep, branch) = fork root
    root = keep                                  // re-assign the consumed variable
    let (branch, idea) = gen branch ++ "\nIdea:" max 24
    print(idea)
    drop branch
  }
  drop root
}
```

`root = keep` is an **assignment** to an existing variable. It's allowed because `root` was consumed by the `fork`. Assigning to a context that is still live would leak it (`V0102`).

Next: [3. Structured generation →](/tutorial/structured/)
