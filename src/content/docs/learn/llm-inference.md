---
title: 1. How LLMs generate text
description: Tokens, the autoregressive decode loop, and the difference between prefill and decode.
---

## Tokens

A language model never sees characters. Text is first split into **tokens** by a *tokenizer*. Most modern tokenizers use **byte-pair encoding (BPE)**: they start from raw bytes and repeatedly merge the most frequent adjacent pairs into new vocabulary entries. Common words become one token (`" the"`), rare words split into pieces (`"un" "believ" "able"`), and anything unknown falls back to single bytes.

A useful consequence: **every token covers at least one byte**, so

$$\text{tokens}(s) \le \text{bytes}(s).$$

Veer uses exactly this fact. A string literal of 40 bytes has the type `str<=40`: it is *at most* 40 tokens, whatever tokenizer the model uses. The bound is loose (English averages about 4 bytes per token), but it is **sound**: it can never be too small. A sound bound is what lets the compiler make guarantees.

## The autoregressive loop

A transformer is a function from a sequence of tokens to a probability distribution over the **next** token. Generation repeats it:

```text
prompt:  The cache is
step 1:  The cache is  → " full"
step 2:  The cache is full → "."
step 3:  The cache is full. → <end>
```

Each step appends the chosen token and runs the model again. The choice is made by **sampling** from the distribution: `temperature = 0` always takes the most likely token (deterministic), higher temperatures add randomness. Generation stops at an end-of-sequence token, a **stop string**, or a **maximum token count**.

In Veer this is `gen`:

```veer
let (c, reply) = gen c ++ "Answer:" max 64 stop "\n"
```

`max 64` is part of the program, not a runtime knob. It is what lets the compiler know that `reply` has type `str<=64` and that the context grows by at most 64 tokens.

## Prefill vs decode

Running a request has two very different phases.

**Prefill** processes the whole prompt at once. All prompt tokens go through the network in parallel, as large matrix multiplications. This is **compute-bound**: the GPU's arithmetic units are the bottleneck. Its cost grows with prompt length and determines **time to first token (TTFT)**.

**Decode** produces one token per step. Each step does very little arithmetic (one token's worth) but must read *all* the model weights and the whole KV cache from memory. This is **memory-bandwidth-bound**. Its cost per token is the **time per output token (TPOT)**.

| | Prefill | Decode |
|---|---|---|
| tokens per step | the whole prompt | 1 (per request) |
| bottleneck | compute (FLOPs) | memory bandwidth |
| metric | TTFT | TPOT / inter-token latency |
| Veer counts it as | `prefill tokens` | `decode tokens` |

This is why `veer plan` reports the two separately: they cost different resources, and they are optimized differently. Prefill tokens that are **shared** (already in cache) cost nothing to recompute, which is the whole point of prefix sharing. Re-prefilling the same tokens after an edit is pure waste, which is what `splice` cost reports expose.

## Batching

A GPU serving one decode stream is mostly idle (memory-bound, little math). Servers therefore **batch** many requests: every decode step processes one token from each of, say, 64 requests, reusing each weight read 64 times. *Continuous batching* (introduced by the Orca paper) lets requests join and leave the batch at every step instead of waiting for the slowest one.

Batch size is limited mostly by **KV-cache memory**: every request in the batch needs its own cache resident on the GPU. That is the subject of the next chapter, and it is the resource Veer's planner bounds.

## Key takeaways

- Tokens ≤ bytes, so byte counts give sound token bounds.
- Generation is a loop; `max` bounds how far it can go.
- Prefill is compute-bound and parallel; decode is memory-bound and sequential.
- KV memory limits how many requests a GPU can serve at once.

Next: [2. The KV cache →](/learn/kv-cache/)
