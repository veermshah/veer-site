---
title: Why Veer?
description: The gap Veer fills, and how it differs from SGLang, LMQL, DSPy, and kernel DSLs.
---

## The gap

LLM programs (agents, RAG, tree search, multi-agent workflows) are increasingly limited by **KV-cache memory and prefill cost**, not by model quality. Yet these programs are written in Python against string-in/string-out APIs. The serving engine sees a stream of opaque requests and must *infer* structure:

- which prefixes are shared (radix-tree matching),
- which caches will be reused soon (LRU guesses, which KVFlow showed are often wrong),
- whether an edit to the history is about to cost 30,000 tokens of re-prefill (it can't know),
- how much memory a workflow will need (it finds out by running out).

Meanwhile quantization (FP8, MXFP4, NVFP4) is chosen by trial and error, and an overflow or a too-aggressive format shows up as a quiet accuracy regression.

## The approach

Veer makes the structure **explicit and checkable**:

1. **Contexts are linear values.** The compiler sees every KV cache's whole lifetime: creation, sharing (`fork`), growth (`++`, `gen`), editing (`splice`), transactions (`speculate`), and release (`drop`).
2. **A static planner** turns that into proven bounds: peak KV bytes, prefill and decode tokens, context length, re-prefill cost, plus a context DAG with reuse hints for the engine.
3. **Precision types** put the number format and a sound error bound in each tensor's type, so `@accuracy` contracts and overflow are compile-time checks.

## How it compares

| | SGLang frontend | LMQL / Guidance | DSPy | Triton / TileLang / Mojo | **Veer** |
|---|---|---|---|---|---|
| Level | LLM programs (Python DSL) | constrained prompting | prompt optimization | GPU kernels | LLM programs (standalone language) |
| KV reuse | automatic at runtime (RadixAttention) | engine-dependent | none | n/a | **proven statically**, explicit `fork` |
| Memory bound before running | no | no | no | n/a | **yes** (`@budget`) |
| Context editing | no | no | no | n/a | **typed spans + `splice`** with cost |
| Speculation semantics | no | no | no | n/a | **`speculate` / `commit` / `rollback`** |
| Leaks / use-after-free | possible | possible | n/a | n/a | **compile errors** |
| Numeric accuracy | n/a | n/a | n/a | manual | **types with error bounds** |

Veer is complementary to serving engines: it runs *on top of* SGLang, vLLM, or llama.cpp through their OpenAI-compatible APIs, and its plan output is designed to feed engine-side policies (eviction, admission, disaggregated transfer).

See [Research and motivation](/research/) for the papers behind each design decision.
