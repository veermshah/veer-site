---
title: "Precision types: choosing a 4-bit format"
description: "Veer cookbook: precision types: choosing a 4-bit format."
sidebar:
  order: 5
---

The same tiny MLP with weights in NVFP4, INT8, MXFP4, and overflow-aware MXFP4. The types carry proven worst-case error bounds, and `@accuracy` contracts turn them into compile-time checks.

File: `examples/quant_mlp.veer` (included in every [release download](/download/))

```veer
// The precision layer: number formats and error bounds live in the types.
// `veer types` prints each function's inferred bound; @accuracy turns it into
// a compile-time contract. Bounds are sound worst cases (every input in range,
// every rounding adversarial), so they are larger than typical measured error.

// NVFP4 weights: worst-case relative error ≈ 0.20.
@accuracy(rel <= 0.25)
fn mlp_nvfp4(x: Tensor<[1, 64], f32, abs<=1.0>, w: Tensor<[64, 32], f32, abs<=0.5>) -> Tensor<[1, 32], f32> {
  return (quant(x, bf16) @ quant(w, nvfp4)) |> silu
}

// INT8 weights: ≈ 0.009 worst case.
@accuracy(rel <= 0.01)
fn mlp_int8(x: Tensor<[1, 64], f32, abs<=1.0>, w: Tensor<[64, 32], f32, abs<=0.5>) -> Tensor<[1, 32], f32> {
  return (quant(x, bf16) @ quant(w, int8)) |> silu
}

// MXFP4 uses power-of-two (E8M0) block scales, which waste up to half of the E2M1
// range, so its worst case is 0.25 x block max: about 0.28 here, enough to fail
// the 0.25 contract that NVFP4 (E4M3 scales, 16-wide blocks) meets.
// Try adding `@accuracy(rel <= 0.25)` below: the compiler rejects it (V0301).
// OCP scaling clamps the largest values; overflow-aware scaling (mxfp4_oas) never
// clamps. Same worst case, but OAS avoids the systematic bias on the biggest values.
fn mlp_mxfp4(x: Tensor<[1, 64], f32, abs<=1.0>, w: Tensor<[64, 32], f32, abs<=0.5>) -> Tensor<[1, 32], f32> {
  return (quant(x, bf16) @ quant(w, mxfp4)) |> silu
}

fn mlp_mxfp4_oas(x: Tensor<[1, 64], f32, abs<=1.0>, w: Tensor<[64, 32], f32, abs<=0.5>) -> Tensor<[1, 32], f32> {
  return (quant(x, bf16) @ quant(w, mxfp4_oas)) |> silu
}

fn main() {
  let x = rand_uniform([1, 64], -1.0, 1.0, 7)
  let w = rand_uniform([64, 32], -0.5, 0.5, 42)
  let a = mlp_nvfp4(x, w)
  let b = mlp_int8(x, w)
  let c = mlp_mxfp4(x, w)
  let d = mlp_mxfp4_oas(x, w)
  report(a)
  report(b)
  report(c)
  report(d)
}
```

## Inferred types

```text
$ veer types examples/quant_mlp.veer
fn mlp_nvfp4(x: Tensor<[1, 64], f32, abs<=1, err<=0>, w: Tensor<[64, 32], f32, abs<=0.5, err<=0>) -> Tensor<[1, 32], f32, abs<=32, err<=6.3955>
fn mlp_int8(x: Tensor<[1, 64], f32, abs<=1, err<=0>, w: Tensor<[64, 32], f32, abs<=0.5, err<=0>) -> Tensor<[1, 32], f32, abs<=32, err<=0.2768>
fn mlp_mxfp4(x: Tensor<[1, 64], f32, abs<=1, err<=0>, w: Tensor<[64, 32], f32, abs<=0.5, err<=0>) -> Tensor<[1, 32], f32, abs<=32, err<=8.9721>
fn mlp_mxfp4_oas(x: Tensor<[1, 64], f32, abs<=1, err<=0>, w: Tensor<[64, 32], f32, abs<=0.5, err<=0>) -> Tensor<[1, 32], f32, abs<=32, err<=8.9721>
fn main() -> ()
```

## Simulated run

```text
$ veer run examples/quant_mlp.veer --stats
report `a`: shape [1, 32] fmt f32 | max|x| 2.018 (static ≤ 32) | error 0.2624 (static ≤ 6.3955) ✓ within bound
report `b`: shape [1, 32] fmt f32 | max|x| 2.018 (static ≤ 32) | error 0.0113 (static ≤ 0.2768) ✓ within bound
report `c`: shape [1, 32] fmt f32 | max|x| 2.018 (static ≤ 32) | error 0.5459 (static ≤ 8.9721) ✓ within bound
report `d`: shape [1, 32] fmt f32 | max|x| 2.018 (static ≤ 32) | error 0.2478 (static ≤ 8.9721) ✓ within bound

── engine: sim ──
  peak KV                     0 B   planned ≤ 0 B            ✓
  prefill tokens                0   planned ≤ 0              ✓
  decode tokens                 0   planned ≤ 0              ✓
  reused tokens                 0
  gen calls                     0
```

## Notes

- `veer types` prints each function's inferred bound. NVFP4 is about 0.20 relative, MXFP4 about 0.28, INT8 about 0.009.
- Adding `@accuracy(rel <= 0.25)` to `mlp_mxfp4` is a compile error (`V0301`): power-of-two block scales cost accuracy that E4M3 scales don't.
- `report` shows measured error next to the bound. The bound is a guarantee over all inputs in range, so it's larger than typical error.
