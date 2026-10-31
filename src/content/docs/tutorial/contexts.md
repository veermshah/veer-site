---
title: 1. Contexts
description: Models, contexts, appending, generating, and the linearity rule.
---

A **context** is Veer's central value: a handle to a token sequence and its KV cache on one model. This chapter covers the five things you do with one.

## Declare a model

```veer
model qwen = "Qwen/Qwen2.5-7B-Instruct" { layers: 28, kv_heads: 4, head_dim: 128, kv: bf16 }
```

The string is the model id sent to the server. The fields describe the KV cache (see [The KV cache](/learn/kv-cache/)):

| field | meaning | default |
|---|---|---|
| `layers`, `kv_heads`, `head_dim` | cache geometry | required |
| `kv` | storage format of the cache (`bf16`, `fp8_e4m3`, `nvfp4`, ...) | `bf16` |
| `block` | page size in tokens | `16` |
| `max_ctx` | the model's context window. The planner rejects longer contexts (`V0202`) | unchecked |

## Open, append, generate, drop

```veer
model qwen = "Qwen/Qwen2.5-7B-Instruct" { layers: 28, kv_heads: 4, head_dim: 128 }

fn main() {
  let c = open qwen                         // an empty context (just the BOS token)
  let c = c ++ "Translate to French: cat"   // append text
  let (c, fr) = gen c max 8                 // generate up to 8 tokens
  print(fr)                                 // fr: str<=8
  drop c                                    // release the KV cache
}
```

`gen` returns a pair: the **extended context** (now including the generated tokens) and the **text** that was generated. Its type is `(Ctx<qwen>, str<=8)`.

`++` and `gen` combine naturally: `gen c ++ "Answer:" max 32` appends, then generates.

## The linearity rule

Every operation on a context **consumes** it and returns a new one. The old name can't be used again:

```veer
model m = "x" { layers: 1, kv_heads: 1, head_dim: 8 }
fn main() {
  let c = open m
  let d = c ++ "hello"
  let e = c ++ "again"   // error[V0101]: use of moved context `c`
  drop d, e
}
```

That's why Veer code re-binds the same name over and over (`let c = c ++ ...`). Each `c` is a new handle, and the old one is gone.

And every context must be consumed exactly once. When you're done, `drop` it:

```text
error[V0102]: context `c` is never consumed
   = note: drop it with `drop`, return it, or pass it on: leaked contexts would hold KV memory forever
```

Why so strict? Because a context *is* GPU memory. A use-after-move would read a cache that no longer exists. A leak would pin memory until the server times out. Linearity rules both out at compile time, and it's what lets the planner see every allocation and release (more in [Types and linearity](/learn/type-systems/)).

## Strings have token bounds

Every string type carries an upper bound on its token count:

- a literal `"cat"` has type `str<=3` (tokens ≤ bytes)
- `gen ... max 8` produces `str<=8`
- `a + b` has the sum of the bounds
- a parameter `doc: str<=4096` is declared

Only bounded strings can be appended to a context (`V0117`). That's what makes memory bounds possible.

Next: [2. Forking and sharing →](/tutorial/fork/)
