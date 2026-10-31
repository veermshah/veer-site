---
title: Context operations
description: Semantics, types, and planner accounting of every context operation.
---

| Operation | Type | Engine effect | Planner accounting |
|---|---|---|---|
| `open M` | `Ctx<M>` | new sequence with a BOS token | +1 token prefill, a 1-token segment |
| `open P` (prefix) | `Ctx<model of P>` | new handle sharing the resident prefix | 0 new tokens |
| `c ++ text` | `Ctx<M>` | prefill `text` | +bound(text) prefill, new segment |
| `c ++ #[l] text` | `Ctx<M>` | same, labelled `l` | same, segment labelled |
| `fork c` | `(Ctx<M>, Ctx<M>)` | two handles sharing all of `c`'s cache | no new memory; shared tokens reported |
| `gen c max N [as ...] [stop s]` | `(Ctx<M>, str<=N \| S)` | decode ≤ N tokens and append them | +N decode, new N-token segment |
| `splice c at l with text` | `Ctx<M>` | replace span `l`; later tokens re-prefilled | +bound(text) + tail tokens prefill; the new chain is allocated before the old is freed |
| `drop c` | statement | release the handle | segments freed when their reference count reaches 0 |
| `speculate c { ... }` | `(Ctx<M>, T)` | tentative fork; commit keeps it, rollback restores `c` | original kept resident during the block; outcomes joined |

## Prefixes

`prefix NAME: model = "text"` registers a context root once at program start (BOS + text, prefilled once, resident for the whole run). Every `open NAME` shares it.

## Constraints

- `as json<S>` constrains output to schema `S` and returns an `S` record. The minimal valid value must fit in `max` (`V0116`).
- `as choice["a", "b"]` constrains output to one of the strings and returns `str<=longest`.
- `stop "s"` ends generation at the first occurrence of `s` (excluded from the output).

## Memory model

Contexts are chains of **segments**: each `open`, `++`, `gen` and `splice` creates one. Segments are allocated in whole pages of `block` tokens, and freed when no live context references them. This is a slightly conservative version of paged attention: an engine that packs a new segment into the free slots of the previous page uses *less* memory, never more.
