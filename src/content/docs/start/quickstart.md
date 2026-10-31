---
title: Quickstart
description: Write, check, plan, and run your first Veer program in five minutes.
---

## 1. Write a program

Save this as `hello.veer`:

```veer
model tiny = "Qwen/Qwen2.5-0.5B-Instruct" { layers: 24, kv_heads: 2, head_dim: 64, kv: bf16 }

fn main() {
  let c = open tiny ++ "Say hello to Veer in five words:"
  let (c, reply) = gen c max 16
  print(reply)
  drop c
}
```

- `model` declares the shape of the model's KV cache (layers, KV heads, head dimension, storage format).
- `open tiny` creates an empty **context**, a handle to a KV cache.
- `++` appends text, and `gen ... max 16` generates up to 16 tokens.
- `drop c` releases the cache. Leave it out and the program won't compile.

## 2. Check it

```sh
$ veer check hello.veer
ok: 1 function(s) checked, 1 planned
  main             peak KV ≤ 768.00 KiB · prefill ≤ 33 tok · decode ≤ 16 tok
```

Delete the `drop c` line and check again:

```text
error[V0102]: context `c` is never consumed
 --> hello.veer:8:1
   = note: drop it with `drop`, return it, or pass it on: leaked contexts would hold KV memory forever
```

## 3. Plan it

```sh
$ veer plan hello.veer
plan for `main`
  model tiny       kv=bf16 · 12.00 KiB/token · page 16 tok
  peak KV memory    768.00 KiB  at line 6
  live at peak      c (49 tok)
  prefill tokens    ≤ 33
  decode tokens     ≤ 16
  longest context   ≤ 49 tokens (tiny)
  ...
```

Where do the numbers come from?

- **Bytes per token:** 24 layers × 2 (K and V) × 2 KV heads × 64 dims × 2 bytes (bf16) = 12 KiB.
- **Tokens:** 1 start-of-sequence token + 32 prompt tokens (the prompt is 32 bytes, and tokens ≤ bytes) + at most 16 generated = 49.
- **Pages:** each segment is allocated in whole 16-token pages: 16 + 32 + 16 = 64 page-tokens × 12 KiB = **768 KiB**.
- **Prefill** is 1 + 32 = 33 tokens, and **decode** is at most 16.

## 4. Run it

```sh
$ veer run hello.veer --stats
context maybe

── engine: sim ──
  peak KV              768.00 KiB   planned ≤ 768.00 KiB     ✓
  prefill tokens               33   planned ≤ 33             ✓
  decode tokens                13   planned ≤ 16             ✓
```

The **simulated engine** produces deterministic placeholder text and accounts memory exactly like a paged KV cache, so you can verify plans without a GPU. Point it at a real model with `--engine http` (see [Engines](/reference/engines/)).

## Next

- New to inference? Read [Learn the background](/learn/).
- Ready for more? Start the [Tutorial](/tutorial/contexts/).
