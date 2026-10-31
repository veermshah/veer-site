---
title: 3. Serving systems
description: Paged attention, prefix caching, eviction, disaggregation, and speculative decoding.
---

An **inference engine** (vLLM, SGLang, TensorRT-LLM, llama.cpp) turns a model into a service. Its hardest job is managing KV-cache memory for hundreds of concurrent requests. Here are the ideas Veer's planner models.

## Paged attention

Early engines reserved one contiguous buffer per request, sized for the maximum possible length. Most of it sat empty, and memory fragmented.

**PagedAttention** (the vLLM paper, SOSP 2023) borrowed virtual memory from operating systems. The cache is split into fixed-size **blocks** (pages) of, say, 16 tokens. Each request has a **block table** mapping its logical token positions to physical blocks anywhere in GPU memory. Memory is allocated one block at a time, so waste is at most one partly filled block per sequence.

Blocks can be **shared**: two sequences with a common prefix point to the same physical blocks, with a reference count. If one sequence writes into a shared, partly filled block, the engine copies it first (**copy-on-write**).

**In Veer:** a model's `block:` field is the page size. The planner rounds every segment up to whole pages, and the simulated engine allocates the same way, so the bound it proves is in real page-granular bytes.

## Prefix caching and RadixAttention

Paging makes sharing *possible*; something must still *find* shared prefixes. **SGLang's RadixAttention** (Zheng et al., NeurIPS 2024) keeps every request's cached tokens in a **radix tree** keyed by token sequence. A new request walks the tree to find the longest cached prefix and prefills only the rest. When memory runs out, it evicts **least-recently-used** leaves.

This is automatic and works for any client, but it is a runtime *guess*: the engine cannot know which cached prefixes the program will use next.

## Eviction is a prediction problem

**KVFlow** (NeurIPS 2025) showed that in multi-agent workflows LRU often evicts an agent's cache right before that agent runs again, because the workflow is cyclic and LRU only looks backwards. Their fix builds an *Agent Step Graph* and evicts by **steps-to-execution**: how soon each cache will be used. The catch is that the graph has to be reconstructed at runtime from observed behaviour.

**In Veer:** the program *is* the graph. `veer plan --json` emits the context DAG and, for each shared segment, the steps at which it is used (`reuse_hints`), which is exactly the information a steps-to-execution policy needs.

## Hierarchical caches and disaggregation

- **Offloading** (LMCache, Mooncake): cache that doesn't fit in GPU memory moves to CPU RAM or SSD and is copied back on reuse.
- **Prefill/decode disaggregation** (DistServe OSDI 2024, Mooncake FAST 2025): prefill and decode have different bottlenecks ([chapter 1](/learn/llm-inference/)), so they run on different GPU pools and the KV cache is **transferred** between them.

Both make *knowing the footprint in advance* more valuable: how much to transfer, what to keep where.

## Speculative decoding

Decode is memory-bound, so the GPU has spare compute. **Speculative decoding** uses it: a small, fast *draft* model guesses the next *k* tokens, then the big model checks all *k* in one parallel pass. Accepted tokens are kept, and the first rejected one is replaced. Output quality is unchanged and latency drops 2–3×.

The KV cache must support this: draft tokens are appended *tentatively* and removed on rejection. A 2026 paper on **transactional KV caching** separates committed cache from a speculative buffer for exactly this reason.

**In Veer:** `speculate` is that transaction at the program level:

```veer
let (c, patch) = speculate c {
  let (c, p) = gen c ++ "Patch:" max 64
  if looks_valid(p) { commit (c, p) } else { rollback "no patch" }
}
```

Inside the block you work on a speculative copy that shares all of `c`'s cache. `commit` keeps the new tokens and releases the original; `rollback` discards everything the block created and gives you back the original context. The type checker guarantees every path ends in one of the two, and the planner accounts for both outcomes.

## What engines cannot know

| Question | Engine today | With Veer |
|---|---|---|
| Will this prefix be reused? | guess (LRU) | known: the DAG says when |
| Peak memory of this agent? | discover by running | proven upper bound |
| Is this edit going to re-prefill 30k tokens? | silent | warning `W0210` with the token count |
| Did the client leak a context? | timeout / garbage collection | compile error `V0102` |

Next: [4. Agents and context editing →](/learn/agents/)
