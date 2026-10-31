---
title: Builtins
description: Built-in functions for strings, tensors, and output.
---

## General

| function | type | notes |
|---|---|---|
| `print(x, ...)` | `()` | prints values separated by spaces. Contexts can't be printed |
| `len(s)` | `int` | tokens (bytes) of a string, or length of a list |
| `contains(s, sub)` | `bool` | substring test |
| `to_str(x)` | `str<=24` | int, float, or bool to string |
| `trim(s)` | same as `s` | strip whitespace |

## Tensors

| function | result |
|---|---|
| `rand_uniform([d, ...], lo, hi, seed)` | f32 tensor, uniform in [lo, hi]. `lo`/`hi` must be constants |
| `zeros([d, ...])` | f32 zeros |
| `quant(t, fmt)` | `t` quantized to `fmt` (values kept dequantized for compute) |
| `matmul(a, b)`, `a @ b` | 2-D matrix product, f32 accumulation |
| `add(a, b)`, `a + b`, `a - b` | elementwise, with row broadcast |
| `scale(t, c)`, `t * c` | multiply by a constant |
| `relu(t)`, `silu(t)` | activations |
| `measured_err(t)` | `float`: measured ‖computed − exact‖∞ |
| `report(t)` | prints shape, format, measured vs static magnitude and error |

`x |> f` is sugar for `f(x)`, and `x |> f(a)` for `f(x, a)`.
