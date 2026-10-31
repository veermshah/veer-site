---
title: 5. Number formats and quantization
description: Floating point from scratch, FP8, block-scaled FP4 (MXFP4, NVFP4), and INT8, with their exact error characteristics.
---

Inference increasingly runs in **low precision**: 8 or even 4 bits per number instead of 16 or 32. That cuts memory and bandwidth (the decode bottleneck) and doubles or quadruples tensor-core throughput, but every rounding loses information. This chapter is about exactly how much.

## Floating point in one picture

A floating-point number is

$$(-1)^{\text{sign}} \times 1.\text{mantissa} \times 2^{\text{exponent} - \text{bias}}$$

- **Exponent bits** set the **range** (how big and how small).
- **Mantissa bits** set the **precision** (how many distinct values per power of two).

Between 1 and 2, a format with *p* mantissa bits has 2^p evenly spaced values, so rounding to the nearest one is off by at most half a step. The **unit roundoff** is

$$u = 2^{-(p+1)}, \qquad |\text{round}(x) - x| \le u\,|x| \quad\text{(for normal numbers)}.$$

Near zero, numbers become *subnormal* (no implicit leading 1), and the error is bounded by an absolute **floor** of half the smallest step instead.

| Format | exponent / mantissa bits | max | unit roundoff *u* | typical use |
|---|---|---|---|---|
| `f32` | 8 / 23 | 3.4 × 10³⁸ | 6 × 10⁻⁸ | accumulation |
| `bf16` | 8 / 7 | 3.4 × 10³⁸ | 0.39 % | weights, activations |
| `f16` | 5 / 10 | 65,504 | 0.049 % | older GPUs |
| `fp8_e4m3` | 4 / 3 | 448 | 6.25 % | weights, activations, **KV cache** |
| `fp8_e5m2` | 5 / 2 | 57,344 | 12.5 % | gradients |

bf16 keeps f32's range with fewer mantissa bits, which is why it replaced f16 for training. **FP8 E4M3 tops out at 448**: quantize a value of 1,000 without scaling and it saturates. Veer catches that at compile time (`V0302`), because each tensor's type carries a magnitude bound.

## Integer quantization with a scale

`int8` stores integers −127…127 plus one floating-point **scale** per tensor:

$$\text{scale} = \frac{\max|x|}{127}, \qquad q = \operatorname{round}(x / \text{scale}), \qquad \hat{x} = q \cdot \text{scale}.$$

The error is at most half a step: |x̂ − x| ≤ scale/2 = max|x| / 254. That is **relative to the tensor's maximum**, not to each element. Small elements next to one large outlier get relatively large errors. That is the outlier problem, and the motivation for finer-grained scales.

## Block scaling: MXFP4 and NVFP4

4-bit floats have only 16 codes. The **E2M1** element format represents just

$$\pm\{0,\ 0.5,\ 1,\ 1.5,\ 2,\ 3,\ 4,\ 6\}.$$

To be useful, every small **block** of elements gets its own scale.

**MXFP4** (OCP Microscaling spec v1.0): blocks of **32** elements share an **E8M0** scale, a pure power of two. The spec chooses scale = 2^(⌊log₂ max⌋ − 2), so the block maximum lands in [4, 8) after scaling. Storage: 4 bits + 8/32 bits = **4.25 bits per element**.

**NVFP4** (NVIDIA Blackwell): blocks of **16** elements share an **FP8 E4M3** scale (≈ max/6, so the block max maps to about 6), plus one f32 scale per tensor. Storage: **4.5 bits per element**.

### Working out the worst case

**MXFP4.** After scaling, the block maximum is in [4·s, 8·s). Two things can go wrong:

- *Rounding.* Between 4 and 6 the E2M1 step is 2, so a value can be off by up to 1·s. Since max ≥ 4·s, that is at most **max / 4**.
- *Clamping.* Values in (6·s, 8·s) don't fit and saturate to 6·s, an error below 2·s. That only happens when max > 6·s, so the error is below (max − 6s) < max/4.

Worst case: **|x̂ − x| ≤ 0.25 × block max.** The weak point is the power-of-two scale: the block max can land anywhere in a 2× range [4, 8), and the grid is coarse at the top.

**NVFP4.** The E4M3 scale is within 1/16 of max/6, so the block max lands in about [5.6, 6.4]. The rounding error is ≤ 1·s ≈ (17/16)·max/6, so **|x̂ − x| ≤ 0.177 × block max**. A finer scale (and smaller blocks, which isolate outliers) buys a 30 % better worst case for 0.25 more bits.

**Overflow-aware MXFP4** (`mxfp4_oas`) picks scale = 2^⌈log₂(max/6)⌉ so nothing ever clamps. Its worst case is the same 0.25 (rounding at max = 4·s), but it avoids systematically clipping the largest values, which matters for accuracy on average. An ICML 2026 paper on MXFP4 quantization error proposes this kind of fix.

| Format | bits/elem | worst-case error | relative to |
|---|---|---|---|
| `bf16` | 16 | 0.39 % | each element |
| `fp8_e4m3` | 8 | 6.25 % | each element (+ max 448) |
| `int8` | 8 | 0.39 % | tensor max |
| `nvfp4` | 4.5 | 17.7 % | block max (16) |
| `mxfp4`, `mxfp4_oas` | 4.25 | 25 % | block max (32) |

These are exactly the constants in Veer's `veer-numerics` crate, each one property-tested against a bit-exact simulator.

## What gets quantized

- **Weights**: static, quantized once (GPTQ, AWQ, MXFP4 checkpoints).
- **Activations**: dynamic, quantized on the fly before a matmul.
- **KV cache**: an FP8 KV cache halves the memory from [chapter 2](/learn/kv-cache/). In Veer, `kv: fp8_e4m3` in a model declaration changes the planner's bytes-per-token.

Next: [6. Error analysis →](/learn/error-analysis/)
