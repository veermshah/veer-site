---
title: 6. Error analysis
description: How rounding errors combine through additions, matrix multiplications, and activations, and how Veer turns that into a type.
---

Knowing the error of one rounding is not enough: a model does millions of operations. **Error analysis** tracks how errors combine.

## Absolute and relative error

If the exact value is *x* and we computed *x̂*:

- absolute error |x̂ − x|
- relative error |x̂ − x| / |x|

Relative error is natural for one rounding (`u|x|`), but it breaks down when exact values cancel: the relative error of a near-zero result can be enormous even when every step was accurate. So Veer tracks **absolute** error together with a **magnitude bound**.

## Veer's bound: a pair (m, e)

Every tensor type carries two numbers:

- **m**: every exact value satisfies |x| ≤ m
- **e**: every computed value satisfies |x̂ − x| ≤ e

```veer
Tensor<[1, 32], f32, abs<=32, err<=6.3955>
```

The summary "relative error" Veer reports is e / m: error relative to the largest value the tensor could hold.

## Propagation rules

Each operation maps input bounds to output bounds. Veer's rules are **rigorous** (no first-order approximations):

**Quantize to a format.** The input can reach m + e, so

$$e' = e + c_f\,(m + e) \;[+\ \text{floor}_f], \qquad m' = m$$

where *c_f* is the format's constant from [chapter 5](/learn/number-formats/). For non-scaled formats Veer also checks m + e ≤ max_f, otherwise you get overflow error `V0302`.

**Addition.** Errors add, plus one f32 rounding:

$$e' = e_1 + e_2 + u_{32}\,(m_1 + m_2 + e_1 + e_2), \qquad m' = m_1 + m_2$$

**Matrix multiplication** `[.., K] @ [K, ..]`. Each output is a dot product of length *K*:

$$\hat{y} - y = \underbrace{\sum_k (\hat{x}_k \hat{w}_k - x_k w_k)}_{\text{input errors}} + \underbrace{\left(\mathrm{fl}\!\left(\sum_k \hat{x}_k\hat{w}_k\right) - \sum_k \hat{x}_k \hat{w}_k\right)}_{\text{accumulation error}}$$

The first part is at most K(e_x m_w + m_x e_w + e_x e_w). The second is the classic inner-product bound (Higham, *Accuracy and Stability of Numerical Algorithms*): with

$$\gamma_K = \frac{K u}{1 - K u}, \qquad |\mathrm{fl}(\textstyle\sum) - \textstyle\sum| \le \gamma_K \sum_k |\hat{x}_k \hat{w}_k| \le \gamma_K\, K\,(m_x + e_x)(m_w + e_w).$$

And m' = K · m_x · m_w.

**Elementwise functions.** If *f* is *L*-Lipschitz (|f(a) − f(b)| ≤ L|a − b|) then input error e becomes L·e. SiLU is 1.0998-Lipschitz and |silu(x)| ≤ |x|, so e' = 1.1e + (rounding) and m' = m. ReLU has L = 1 and is exact.

## A worked example

From `examples/quant_mlp.veer`: x has |x| ≤ 1, stored as bf16; W has |w| ≤ 0.5, stored as NVFP4; K = 64.

1. x in bf16: e_x ≈ 0.0039 × 1
2. W in NVFP4: e_w ≈ 0.177 × 0.5 = 0.089
3. x @ W: m = 64 × 1 × 0.5 = 32, e ≈ 64 × (0.0039 × 0.5 + 1 × 0.089 + …) ≈ 5.8
4. SiLU: e ≈ 1.1 × 5.8 ≈ 6.4

So `mlp_nvfp4` returns `abs<=32, err<=6.3955`: relative bound 0.20, which satisfies `@accuracy(rel <= 0.25)`. With MXFP4 weights the bound is 8.97 (0.28) and the same contract is rejected at compile time.

## Worst case vs typical

Running the example prints

```text
report `a`: ... | error 0.2624 (static ≤ 6.3955) ✓ within bound
```

The measured error is 25× smaller than the bound. That is expected: the bound assumes **every** rounding goes the worst way and **every** input is at its maximum. Random errors partly cancel, growing like √K instead of K.

So what is a worst-case bound good for?

- **It is a guarantee.** No input in the declared range can exceed it. That is what a type system needs.
- **It ranks formats correctly.** NVFP4 < MXFP4 holds in the bound and in practice.
- **It catches structural mistakes.** An FP8 overflow, quantizing an already-quantized tensor, or an accumulation length that blows up γ_K all show up as large bounds.

Veer's bounds are deliberately the conservative, sound kind. Probabilistic bounds are on the [roadmap](/reference/limitations/).

## Soundness is tested, not assumed

`crates/veer-numerics/tests/soundness.rs` generates thousands of random tensors (including wildly varying magnitudes that stress block scales), runs the bit-exact quantization simulators, and asserts measured error ≤ static bound for every format and every operation chain. A test can only catch bounds that are too *small*. A bound that is too *large* is still sound, just loose: an earlier MXFP4 constant of 0.5 was found by re-deriving it by hand, tightened to 0.25, and the same tests then confirmed the tighter constant is still sound.

Next: [7. Types, linearity, and static analysis →](/learn/type-systems/)
