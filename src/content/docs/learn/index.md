---
title: Learn the background
description: Everything you need to know to understand what Veer does and why, from tokens to KV-cache math, quantization error, and linear types.
---

Veer sits where three fields meet: **LLM inference systems**, **numerical computing**, and **programming-language theory**. You do not need to be an expert in any of them. These seven short chapters build up exactly the ideas Veer relies on, with worked numbers.

| Chapter | You will learn | Veer feature it explains |
|---|---|---|
| [1. How LLMs generate text](/learn/llm-inference/) | tokens, the decode loop, prefill vs decode | `gen`, `max`, token bounds `str<=N` |
| [2. The KV cache](/learn/kv-cache/) | what K and V are, the memory formula, why prefixes can be shared | `Ctx<M>`, `fork`, the `model` declaration |
| [3. Serving systems](/learn/serving/) | paged attention, prefix caching, eviction, speculative decoding | the planner's memory model, `speculate` |
| [4. Agents and context editing](/learn/agents/) | agent loops, structured output, why editing history is expensive | `splice`, spans, `json<T>`, `choice[...]`, tools |
| [5. Number formats](/learn/number-formats/) | floating point, FP8, block-scaled FP4 (MXFP4, NVFP4), INT8 | `Tensor<[..], fmt>`, `quant`, `kv: fp8_e4m3` |
| [6. Error analysis](/learn/error-analysis/) | rounding error, how it grows through a matmul, worst-case bounds | `abs<=`, `err<=`, `@accuracy` |
| [7. Types, linearity, static analysis](/learn/type-systems/) | type soundness, linear types, abstract interpretation | the checker, the planner, the error codes |

There is also a [glossary](/learn/glossary/) for quick lookups.

**Suggested path.** Read 1 → 2 → 7 first (about 30 minutes). That is enough to follow the [Tutorial](/tutorial/contexts/) up to chapter 6. Read 3 and 4 when you want to understand *why* the planner's numbers matter, and 5 and 6 before the [precision tutorial](/tutorial/precision/).

## The one-paragraph version

An LLM reads text as **tokens** and produces one token at a time. To avoid recomputing everything for every new token, it stores two vectors per token per layer, the **keys and values**, in GPU memory: the **KV cache**. For an 8-billion-parameter model that is about 128 KiB *per token*, so a few long conversations fill a GPU. Serving engines share cache between requests with the same prefix and evict cache they think is unused, but they have to *guess*, because the program that will use the cache is opaque to them. Veer makes that program transparent: contexts are **linear values** (each one is used exactly once, like Rust's owned values), so the compiler can follow every cache from creation to release and **prove** peak memory, cost, and sharing. The same idea applies to numerics: each tensor's type carries its **number format** and a proven **error bound**, so a too-aggressive quantization is a compile error, not a surprise in production.
