---
title: Research and motivation
description: The papers behind Veer's design, what each one leaves open, and how Veer addresses it.
---

Veer was designed by surveying current inference-systems and quantization research (through late 2026) and looking for a gap that a **programming language**, rather than another runtime heuristic, could close.

## The survey

### KV-cache reuse is runtime-only

**SGLang** (Zheng et al., *SGLang: Efficient Execution of Structured Language Model Programs*, NeurIPS 2024, [arXiv 2312.07104](https://arxiv.org/abs/2312.07104v1)) introduced a Python-embedded frontend language for LLM programs plus **RadixAttention**, which keeps all requests' KV caches in a radix tree with LRU eviction and reuses shared prefixes automatically. It reports up to 6.4× throughput over prior systems.
*What it leaves open:* reuse is discovered at runtime. Nothing about sharing or memory is known before execution, and the frontend can't express (or check) cache lifetimes.

**KVFlow** (*Efficient Prefix Caching for Accelerating LLM-Based Multi-Agent Workflows*, NeurIPS 2025, [arXiv 2507.07400](https://arxiv.org/abs/2507.07400)) showed that LRU "often discards KV caches shortly before their reuse" in agent workflows. It builds an Agent Step Graph and evicts by steps-to-execution, for up to 1.83× (single workflow) and 2.19× (concurrent) speedups over SGLang's hierarchical radix cache.
*What it leaves open:* the workflow graph is reconstructed at runtime from the agent framework.

**AAFLOW+** ([arXiv 2607.10987](https://www.alphaxiv.org/abs/2607.10987), 2026) treats the KV cache as a first-class object in workflow operators, with a compiler choosing between text passing, KV reuse, state transfer, and eviction.
*What it leaves open:* there's no typed language or safety guarantee around the KV objects.

### Agents need to edit their caches

**Leyline** (Ma, Eitzinger & Köstler, *KV Cache Directives for Agentic Inference*, [arXiv 2606.01065](https://arxiv.org/abs/2606.01065), 2026) argues serving engines assume append-only caches, while agents revise their histories. A directive is a `(span, replacement)` pair operating on *semantic spans* of the prompt, with tokens before the edit kept in the radix cache. It reports +11.2 points replay cache-hit, up to 241 ms lower latency, and +14.3 points solve rate on debug-gym from a ten-line truncation policy. (An independent review notes that production harnesses still fall back to re-prefilling on every edit.)
*What it leaves open:* directives are unchecked strings. Nothing ensures a span exists, isn't ambiguous, or that an edit's re-prefill cost is acceptable.

### Speculation needs transactional caches

A 2026 **transactional KV caching** proposal for speculative decoding ([TechRxiv](https://www.techrxiv.org/doi/pdf/10.36227/techrxiv.177101038.80960856/v1)) separates committed cache state from a speculative buffer, noting that draft tokens force block-granular reservations in paged caches. SLO-aware speculative serving (AdaServe, EuroSys 2026) points the same way.

### Memory is the binding constraint

Non-clairvoyant KV scheduling ([arXiv 2601.22996](https://arxiv.org/abs/2601.22996)) models batching under a hard KV-memory budget where each request's footprint grows as it decodes, which makes admission risky *because footprints are unknown in advance*. Disaggregated serving (DistServe, OSDI 2024; **Mooncake**, FAST 2025 Best Paper) and offloading (LMCache) all move KV caches between devices, which again benefits from knowing footprints ahead of time.

### Kernel DSLs are a different layer

**TileLang** ([arXiv 2504.17577](https://arxiv.org/abs/2504.17577)), Triton, ThunderKittens and Mojo make *kernels* easier to write. They work below the level where KV-cache lifetimes, sharing, and agent control flow live, so they are complementary to Veer, not alternatives.

### Quantization error is analyzed but not typed

MXFP4/NVFP4 analyses (for example, *Transforms for LLM Quantization*, [arXiv 2608.25188](https://arxiv.org/abs/2608.25188); Chhugani et al., *Unveiling the Potential of Quantization with MXFP4*, [ICML 2026](https://proceedings.mlr.press/v306/chhugani26a.html)) characterize the error sources precisely: power-of-two scale rounding, block clamping, and the advantage of NVFP4's E4M3 scales. The ICML paper's two software fixes, overflow-aware scaling and macro block scaling, narrow the MXFP4–NVFP4 accuracy gap from about 10 % to under 1 % on average.
*What is left open:* we found no compiler or type system that tracks **number format and error bound** through a computation. Precision choices are validated by running evaluations.

## The gap

> **No language treats an LLM context, meaning its KV cache, as a typed resource whose sharing, editing, speculation, and lifetime are checked at compile time, and no compiler proves a program's KV memory and prefill cost before it runs. Separately, no type system carries number formats and sound error bounds.**

## How Veer answers each paper

| Finding | Veer |
|---|---|
| Reuse discovered at runtime (SGLang) | `fork` makes sharing explicit; the planner *proves* it and reports savings |
| LRU evicts just before reuse (KVFlow) | the context DAG and `reuse_hints` are emitted statically (`veer plan --json`) |
| KV as a first-class object (AAFLOW+) | `Ctx<M>` is a linear type: no leaks, no use-after-free, precise aliasing |
| Agents edit caches (Leyline) | typed spans `#[l]` + `splice`, with must/may checking and compile-time re-prefill cost (`W0210`) |
| Transactional KV for speculation | `speculate { commit / rollback }` with automatic release and both outcomes planned |
| Footprints unknown at admission | `@budget(kv, prefill)` proven at compile time |
| Format errors characterized, not typed | `Tensor<[..], fmt, abs<=, err<=>` with sound propagation and `@accuracy` contracts |

## Validating the claims

- **Planner soundness:** 400 random programs per test run, executed on the simulated engine (which implements the memory model exactly). Measured ≤ planned for peak KV, prefill, and decode, with no leaks. A planted bug makes the test fail.
- **Numeric soundness:** thousands of random tensors (including adversarial mixed magnitudes) per run, across all nine formats and full MLP chains. Measured error ≤ static bound.
- **Diagnostics:** every documented error example is compiled and must produce its code.
- **Docs:** every complete program in this site is compiled in CI.

See [Limitations and roadmap](/reference/limitations/) for what isn't solved yet.
