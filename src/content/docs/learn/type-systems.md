---
title: 7. Types, linearity, and static analysis
description: What a sound type system guarantees, why linear types fit GPU memory, and how abstract interpretation bounds a program's resource use.
---

The last ingredient is programming-language theory. Three ideas do all the work in Veer.

## 1. Types and soundness

A **type system** assigns every expression a *type*, a description of the values it can produce, and rejects programs whose types don't fit together. A type system is **sound** when "the program type-checks" really does imply "this class of error cannot happen at runtime".

Veer's types say more than usual:

| Type | What it promises |
|---|---|
| `str<=128` | a string of at most 128 tokens |
| `Ctx<llama>` | a live handle to a KV cache on model `llama`, with a known set of labelled spans |
| `Tensor<[1, 32], f32, abs<=32, err<=6.4>` | shape [1, 32], every exact value ≤ 32 in magnitude, computed values within 6.4 of exact |
| `[str<=80; <=8]` | a list of at most 8 strings of at most 80 tokens |

Types that carry numbers like these are a light form of **refinement types**. Veer keeps the arithmetic simple (sums, maxima, the rules from [chapter 6](/learn/error-analysis/)), so checking stays fast and predictable.

## 2. Linear types

In most languages you can copy a reference and use it as often as you like. That is fine for numbers, but wrong for **resources**: a file handle, a lock, or a block of GPU memory.

A **linear** value must be used **exactly once**. An **affine** value may be used *at most* once. Rust's ownership is affine: after `let b = a;` (a move), using `a` is a compile error.

Veer contexts are linear:

```veer
let c = open llama
let d = c ++ "hello"      // c is consumed here
let e = c ++ "again"      // error[V0101]: use of moved context `c`
```

Every context operation consumes its input and returns a fresh handle. Linearity gives three guarantees for free:

1. **No use-after-free.** You can't read a cache that was released or extended (`V0101`).
2. **No leaks.** A context that goes out of scope without `drop`, `return`, or `commit` is a compile error (`V0102`), so every GPU allocation has a matching release.
3. **Precise aliasing.** Two handles share cache *only* if they came from `fork`. So the compiler knows exactly which tokens are shared and which are private. That is what makes sharing provable rather than hoped for.

Control flow needs care. After `if c { drop x } else { }`, is `x` alive? The checker is **flow-sensitive**: it tracks each context's state along every path and requires them to agree when paths merge (`V0103`). Loops must leave every outer context in the state they found it (`V0104`). To grow a context in a loop, consume and re-assign it: `c = c ++ "step"`.

## 3. Abstract interpretation

The type checker answers yes/no questions. The **planner** answers *how much*: peak memory, tokens prefilled, re-prefill cost. It does this by **abstract interpretation** (Cousot & Cousot, 1977): run the program on *abstract values* that over-approximate all possible concrete values.

- A string becomes its token bound: `"hi"` → ≤ 2, `gen ... max 64` → ≤ 64.
- A context becomes a chain of **segments**, each with a token bound, shared by reference count exactly like the real paged cache.
- `fork` shares the chain; `++` and `gen` add a segment; `splice` copies the tail.

At an `if` whose condition is unknown (it depends on model output), the planner runs **both** branches and **joins** the results: common segments stay shared, and the differing tail becomes one segment as long as the longer branch. The join can only be larger than either branch, which keeps the result an **over-approximation**. Loops have constant trip counts (that is why Veer requires them, `V0113`), so the planner simply runs them that many times. Function calls are inlined (recursion is forbidden, `V0114`).

The peak over all of this is a **sound upper bound**: no real execution, whatever the model generates, can use more KV memory than the planner reports, under Veer's paged memory model.

## Checking the checker

A soundness claim is only as good as its evidence. Veer uses **property-based testing**: `crates/veer-runtime/tests/plan_soundness.rs` generates hundreds of random well-typed programs (forks, branches, loops, splices, speculation), plans them, runs them on the simulated engine, and asserts

$$\text{measured peak} \le \text{planned peak}, \quad \text{measured prefill} \le \text{planned prefill}, \quad \text{no memory left at exit}.$$

Planting a deliberate under-estimate in the planner makes the test fail immediately, which shows the test has teeth.

## How it all maps onto Veer

| Concept | In Veer |
|---|---|
| sound types | `veer check` rejects leaks, misuse, overflow, and budget violations |
| linear types | `Ctx<M>`: `fork`, `++`, `gen`, `splice`, `drop`, `speculate` |
| refinement-style bounds | `str<=N`, `[T; <=N]`, `Tensor<..., abs<=, err<=>` |
| flow-sensitive checking | branch and loop rules `V0103`, `V0104`, span tracking |
| abstract interpretation | the planner (`veer plan`) |
| property-based testing | soundness tests for both the planner and the numerics |

You now have everything you need. Head to the [Tutorial](/tutorial/contexts/), or look things up in the [glossary](/learn/glossary/).
