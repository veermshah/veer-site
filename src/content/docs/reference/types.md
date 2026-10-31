---
title: Types
description: Every Veer type, subtyping, and how bounds are computed.
---

| Type | Values | Notes |
|---|---|---|
| `str<=N` | strings of at most N tokens | `str` (unbounded) is allowed except where appended to a context |
| `int`, `float`, `bool` | 64-bit integer, 64-bit float, boolean | `int` converts to `float` implicitly |
| `()` | unit | functions without `->` return `()` |
| `Ctx<M>` | a **linear** handle to a context on model `M` | see [Linearity rules](/reference/linearity/) |
| `(T1, T2, ...)` | tuples | tuples containing a `Ctx` must be destructured |
| `S` | a record of schema `S` | fields accessed with `.name` |
| `[T; <=N]` | list of at most N elements | from `json<S>` output, iterable with `for` |
| `Tensor<[d..], fmt, abs<=m, err<=e>` | tensor with static shape, format, magnitude and error bounds | see [Precision layer](/reference/precision/) |

## Bounds

String bounds are computed, never guessed:

| expression | type |
|---|---|
| `"text"` | `str<=bytes("text")` |
| `a + b` | `str<=(A + B)` |
| `gen c max N` | `str<=N` |
| `gen c max N as choice[o1, o2]` | `str<=max(bytes(oi))` |
| `to_str(x)` | `str<=24` |
| `trim(s)` | same as `s` |
| tool result | the declared bound (enforced at runtime by truncation) |

## Subtyping

`str<=A` is accepted where `str<=B` is expected if A ≤ B. Any bounded string is accepted where `str` is expected. A tensor is accepted where a tensor type is expected if shape and format match and its `abs`/`err` bounds are no larger. `[T; <=A]` fits `[U; <=B]` if A ≤ B and T fits U.

## Annotations

`let` can carry an annotation, which is required when a variable will later be **assigned** a larger value:

```veer
fn main() {
  let best: str<=96 = ""     // without the annotation `best` would be str<=0
  for i in 0..3 {
    best = "candidate"
  }
  print(best)
}
```

## Function summaries

Functions are checked in call-graph order, callees first. A function's declared return type is checked against its body, and callers see a *refined* type: for tensors, the bound the body actually achieves rather than the declared one. `veer types` prints these summaries.
