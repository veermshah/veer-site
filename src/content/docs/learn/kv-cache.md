---
title: 2. The KV cache
description: What keys and values are, how big the cache is, and why identical prefixes produce identical caches.
---

## Attention in one paragraph

Every transformer layer contains **attention**: each token builds three vectors from its hidden state, a **query** *q*, a **key** *k*, and a **value** *v*. A token's output is a weighted average of the values of all tokens *before* it (and itself), weighted by how well its query matches their keys:

$$\text{out}_i = \sum_{j \le i} \operatorname{softmax}_j\!\left(\frac{q_i \cdot k_j}{\sqrt{d}}\right) v_j$$

The `j ≤ i` is **causality**: a token can only look backwards.

## Why cache keys and values

During decode, the new token needs the keys and values of *every previous token* in *every layer*. Those never change: token *j*'s key depends only on tokens `0..=j`. So instead of recomputing them at every step, the engine computes each token's K and V once and stores them. That store is the **KV cache**.

- **Prefill** fills the cache for all prompt tokens.
- **Decode** reads the whole cache, computes one new token, and appends its K and V.

## How big is it?

Per token, the cache holds a key and a value vector for every KV head in every layer:

$$\text{bytes per token} = 2 \times \text{layers} \times \text{kv\_heads} \times \text{head\_dim} \times \text{bytes per element}$$

**Worked example: Llama-3.1-8B.** 32 layers, 8 KV heads (it uses *grouped-query attention*, below), head dimension 128, stored in bf16 (2 bytes):

$$2 \times 32 \times 8 \times 128 \times 2 = 131{,}072 \text{ bytes} = 128\text{ KiB per token}.$$

| Context length | KV cache (bf16) | KV cache (fp8) |
|---|---|---|
| 1,000 tokens | 125 MiB | 62.5 MiB |
| 8,192 tokens | 1 GiB | 512 MiB |
| 128,000 tokens | 15.6 GiB | 7.8 GiB |

The model's weights are about 16 GB in bf16. A few long conversations need as much memory as the model itself, which is why KV memory, not compute, usually limits how many users a GPU can serve.

This is exactly the information in a Veer `model` declaration:

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128, kv: fp8_e4m3 }
```

`veer plan` prints `64.00 KiB/token` for this model: 128 KiB halved by the 1-byte fp8 KV format.

### Grouped-query attention (GQA)

Original transformers had one K/V head per query head. **Multi-query attention** shares one K/V head across all query heads, and **grouped-query attention** shares each K/V head across a group. Llama-3.1-8B has 32 query heads but only 8 KV heads, a 4× cache saving. That is why the formula uses `kv_heads`, not the number of attention heads.

## Positions and RoPE

Attention by itself has no notion of order, so models inject position information. Most current models use **rotary position embeddings (RoPE)**: the query and key vectors are *rotated* by an angle proportional to the token's position before the dot product.

The consequence for caching: **a token's cached key depends on its absolute position.** If you delete 500 tokens from the middle of a context, every later token is now at a different position, and its cached key is wrong. The usual fix is to recompute (re-prefill) everything after the edit. Some newer work (for example Leyline) corrects the rotation instead of recomputing. Veer's `splice` reports the worst-case re-prefill cost so you can see and avoid it (see [chapter 4](/learn/agents/)).

## Identical prefixes give identical caches

Causality plus deterministic computation means: **if two requests start with the same tokens, their KV caches for those tokens are identical.** A system prompt shared by a million requests needs to be prefilled and stored *once*.

This is the most important optimization in modern serving, and it is the core of Veer's `fork`:

```veer
let c = open SYS ++ document         // prefilled once
let (a, b) = fork c                  // a and b share every cached token of c
let (a, x) = gen a ++ "Summarize:" max 128
let (b, y) = gen b ++ "Find bugs:" max 256
```

After the fork, `a` and `b` each add only their own new tokens. The shared part is stored once. Because contexts are linear values, the compiler *knows* the sharing is real and reports exactly how much memory it saves.

## Key takeaways

- The KV cache stores per-token keys and values so decode does not recompute them.
- Size per token = 2 × layers × kv_heads × head_dim × bytes per element, about 128 KiB for an 8B model in bf16.
- Cached keys depend on position, so editing the middle of a context invalidates everything after it.
- Same prefix ⇒ same cache ⇒ shareable. `fork` makes sharing explicit and provable.

Next: [3. Serving systems →](/learn/serving/)
