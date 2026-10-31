---
title: Precision layer
description: Formats, error constants, propagation rules, and accuracy contracts.
---

## Formats

| name | bits/elem | max (unscaled) | error model | constant |
|---|---|---|---|---|
| `f32` | 32 | 3.4e38 | exact storage | 0 |
| `bf16` | 16 | 3.4e38 | per element: u·\|x\| + floor | u = 2⁻⁸ |
| `f16` | 16 | 65,504 | per element | u = 2⁻¹¹ |
| `fp8_e4m3` | 8 | 448 | per element | u = 2⁻⁴ |
| `fp8_e5m2` | 8 | 57,344 | per element | u = 2⁻³ |
| `int8` | 8 | — (scaled) | c · tensor max | c = 1/254 |
| `mxfp4` | 4.25 | — (block 32, E8M0) | c · block max | c = 0.25 |
| `mxfp4_oas` | 4.25 | — (block 32, overflow-aware) | c · block max | c = 0.25 |
| `nvfp4` | 4.5 | — (block 16, E4M3 + f32) | c · block max | c = 17/96 ≈ 0.177 |

Derivations are in [Number formats](/learn/number-formats/). Each constant is validated against a bit-exact simulator by property tests.

## Bound propagation

A tensor type carries (m, e): ‖exact‖∞ ≤ m, ‖computed − exact‖∞ ≤ e. With u = 2⁻²⁴ (f32 accumulation) and γ_K = Ku/(1 − Ku):

| operation | m' | e' |
|---|---|---|
| `quant(t, f)` per-element | m | e + u_f(m + e) + floor_f, and requires m + e ≤ max_f (`V0302`) |
| `quant(t, f)` scaled | m | e + c_f(m + e) |
| `a + b`, `add(a, b)` | m_a + m_b | e_a + e_b + u(m' + e_a + e_b) |
| `a @ b`, `matmul` (inner dim K) | K m_a m_b | K(e_a m_b + m_a e_b + e_a e_b) + γ_K K (m_a + e_a)(m_b + e_b) |
| `scale(t, c)`, `t * c` | \|c\| m | \|c\| e + 2u\|c\|(m + e) |
| `relu(t)` | m | e |
| `silu(t)` | m | 1.1 e + 8u(m + e) |
| `rand_uniform(shape, lo, hi, seed)` | max(\|lo\|, \|hi\|) | 0 |
| `zeros(shape)` | 0 | 0 |

Shapes: matmul needs `[m, k] @ [k, n]`; add needs equal shapes, or a `[1, n]` row broadcast over `[m, n]` (`V0300`).

## Contracts

`@accuracy(abs <= x)` requires e ≤ x for the returned tensor. `@accuracy(rel <= x)` requires e/m ≤ x. Violations are `V0301`, reported with the inferred type.

## Runtime

Tensors carry computed values (f32, after simulated quantization) and an exact f64 shadow. `measured_err(t)` returns ‖computed − exact‖∞, and `report(t)` prints it beside the static bound.
