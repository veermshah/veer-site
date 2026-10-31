---
title: Glossary
description: Short definitions of every inference, numerics, and PL term used in the Veer docs.
---

**Abstract interpretation.** Running a program on over-approximating abstract values to compute guaranteed bounds. Veer's planner is one. [Ch. 7](/learn/type-systems/)

**Affine / linear type.** A value that may be used at most once (affine) or exactly once (linear). Veer contexts are linear. [Ch. 7](/learn/type-systems/)

**Attention.** The transformer operation where each token mixes the values of earlier tokens, weighted by query–key similarity. [Ch. 2](/learn/kv-cache/)

**Block (page).** Fixed-size unit of KV-cache allocation in paged attention, set by a model's `block:` in Veer. [Ch. 3](/learn/serving/)

**Block scaling / microscaling.** Giving each small group of elements its own scale factor (MXFP4: 32 elements, NVFP4: 16). [Ch. 5](/learn/number-formats/)

**BPE.** Byte-pair encoding, the common tokenizer algorithm. Every token is at least one byte. [Ch. 1](/learn/llm-inference/)

**Constrained decoding.** Masking tokens during generation so the output matches a grammar or JSON schema. `as json<T>`, `as choice[...]`. [Ch. 4](/learn/agents/)

**Context.** In Veer, a linear handle `Ctx<M>` to a sequence of tokens and its KV cache on model `M`.

**Continuous batching.** Letting requests join and leave a decode batch at every step. [Ch. 1](/learn/llm-inference/)

**Decode.** Generating output tokens one at a time. Memory-bandwidth-bound. [Ch. 1](/learn/llm-inference/)

**Disaggregation.** Running prefill and decode on separate GPU pools and transferring the KV cache between them. [Ch. 3](/learn/serving/)

**E2M1, E4M3, E5M2, E8M0.** Minifloat formats named by exponent/mantissa bits. E2M1 is the FP4 element format, E4M3/E5M2 are FP8, E8M0 is the power-of-two MX scale. [Ch. 5](/learn/number-formats/)

**Fork.** Splitting one context into two that share all existing cache. [Tutorial 2](/tutorial/fork/)

**GQA.** Grouped-query attention: several query heads share one KV head, shrinking the cache. [Ch. 2](/learn/kv-cache/)

**γ_K.** Ku/(1 − Ku): the rounding-error growth factor of a length-K sum. [Ch. 6](/learn/error-analysis/)

**KV cache.** Stored key and value vectors for every past token in every layer. [Ch. 2](/learn/kv-cache/)

**Lipschitz constant.** The most a function can stretch distances. It bounds how much input error grows. [Ch. 6](/learn/error-analysis/)

**Prefill.** Processing all prompt tokens in parallel to fill the KV cache. Compute-bound. [Ch. 1](/learn/llm-inference/)

**Prefix caching / RadixAttention.** Reusing the KV cache of shared prompt prefixes across requests. [Ch. 3](/learn/serving/)

**RoPE.** Rotary position embeddings. They make cached keys depend on absolute position, so mid-context edits invalidate the tail. [Ch. 2](/learn/kv-cache/)

**Soundness.** A guarantee that holds for every possible execution, not just the ones you tested. [Ch. 7](/learn/type-systems/)

**Span.** A labelled region of a context (`#[name]`) that `splice` can replace. [Tutorial 4](/tutorial/splice/)

**Speculative decoding.** A draft model proposes tokens that the target model verifies in parallel. Veer's `speculate` gives the transactional cache semantics it needs. [Ch. 3](/learn/serving/)

**Splice.** Replacing a labelled span inside a context. Later tokens are re-prefilled (or position-corrected). [Tutorial 4](/tutorial/splice/)

**TTFT / TPOT.** Time to first token and time per output token, the latency metrics of prefill and decode.

**Unit roundoff (u).** The maximum relative error of rounding one number to a format: 2^-(mantissa bits + 1). [Ch. 5](/learn/number-formats/)
