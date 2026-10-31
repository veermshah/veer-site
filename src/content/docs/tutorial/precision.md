---
title: 7. Precision types
description: Tensors whose types carry a number format and a sound error bound, and @accuracy contracts.
---

Veer's second layer applies the same idea (make it explicit, then prove it) to numerics. Read [Number formats](/learn/number-formats/) and [Error analysis](/learn/error-analysis/) first if those are new.

## Tensor types

```veer
Tensor<[64, 32], f32, abs<=0.5>
```

- the **shape** is static (`[64, 32]`),
- the **format** is one of `f32 bf16 f16 fp8_e4m3 fp8_e5m2 int8 mxfp4 mxfp4_oas nvfp4`,
- `abs<=m` bounds the magnitude of the exact values, and `err<=e` bounds the absolute error (default 0 when `abs` is given).

## Operations

```veer
fn main() {
  let x = rand_uniform([1, 64], -1.0, 1.0, 7)      // Tensor<[1, 64], f32, abs<=1, err<=0>
  let w = rand_uniform([64, 32], -0.5, 0.5, 42)
  let wq = quant(w, nvfp4)                          // error grows by 0.177 × 0.5
  let y = quant(x, bf16) @ wq                       // matmul: shapes checked, bounds propagated
  let z = y |> silu                                 // x |> f  is  f(x)
  report(z)                                         // measured error vs static bound
}
```

Shapes are checked (`[1, 64] @ [128, 8]` is `V0300`). Quantizing a tensor whose magnitude bound exceeds a non-scaled format's range (448 for `fp8_e4m3`) is `V0302`.

`veer types` prints every function's inferred signature, including bounds:

```text
fn mlp_nvfp4(x: Tensor<[1, 64], f32, abs<=1, err<=0>, w: Tensor<[64, 32], f32, abs<=0.5, err<=0>)
   -> Tensor<[1, 32], f32, abs<=32, err<=6.3955>
```

## Accuracy contracts

```veer
@accuracy(rel <= 0.25)
fn mlp_nvfp4(x: Tensor<[1, 64], f32, abs<=1.0>, w: Tensor<[64, 32], f32, abs<=0.5>) -> Tensor<[1, 32], f32> {
  return (quant(x, bf16) @ quant(w, nvfp4)) |> silu
}

@accuracy(rel <= 0.25)
fn mlp_mxfp4(x: Tensor<[1, 64], f32, abs<=1.0>, w: Tensor<[64, 32], f32, abs<=0.5>) -> Tensor<[1, 32], f32> {
  return (quant(x, bf16) @ quant(w, mxfp4)) |> silu   // error[V0301]: bound 0.2804 > 0.25
}
```

`rel` compares e / m. `abs` compares e directly. NVFP4's finer E4M3 block scales meet the contract and MXFP4's power-of-two scales don't, and you learn that at compile time.

## Running it

`veer run examples/quant_mlp.veer` simulates each format bit-exactly and prints the measured error next to the static bound:

```text
report `a`: shape [1, 32] fmt f32 | max|x| 2.018 (static ≤ 32) | error 0.2624 (static ≤ 6.3955) ✓ within bound
```

The bound is a worst case over every input in range and every rounding. Measured error is typically much smaller ([why](/learn/error-analysis/)).

## KV-cache format

The `kv:` field of a model is the same format system applied to the cache: `kv: fp8_e4m3` halves the planner's bytes per token compared to `bf16`, and `kv: nvfp4` cuts it to 4.5/16.

That's the whole language. Next, browse the [Cookbook](/cookbook/review/) or the [Reference](/reference/syntax/).
