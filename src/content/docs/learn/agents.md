---
title: 4. Agents and context editing
description: Agent loops, tools, structured output, branching search, and why editing a context's history is expensive.
---

## The agent loop

An **agent** is an LLM in a loop with tools:

```text
think  → "I should search for the flaky test"
act    → search("cache test flaky")
observe→ <2,000 tokens of search results>
think  → ...
```

Every step appends to the same context. Two problems follow:

1. **Contexts grow fast**, mostly from tool outputs that are useful once and then dead weight.
2. **The context is the agent's memory.** Truncating or rewriting it changes behaviour, so agents increasingly want to *edit* their history: replace a long observation with a one-line summary, or delete a failed attempt.

## Why editing is expensive

From [chapter 2](/learn/kv-cache/): cached keys depend on absolute positions (RoPE). Replace 2,000 tokens in the middle with 20, and every later token shifts left by 1,980 positions. Its cached key is now wrong. Production agent harnesses typically **re-prefill everything after the edit**: correct, but potentially tens of thousands of tokens of wasted compute per step.

**Leyline** (2026) proposes *KV cache directives*: a directive is a `(span, replacement)` pair applied to the serving engine's cache, keeping the tokens before the edit and correcting positions instead of recomputing. It works at the level of *semantic spans* of the prompt, not physical blocks.

**In Veer:** spans are part of the type of a context:

```veer
let c = c ++ "\nObservation: " ++ #[obs] obs     // label the region
let (c, note) = gen c ++ "\nTakeaway:" max 48
let c = splice c at obs with "(summarized)"        // edit it
```

- The checker knows `c` *contains* the span `obs`, so `splice` is safe. Splicing a span that isn't there (or was already spliced away) is error `V0120`.
- Labels can't be duplicated (`V0121`), and loops must not accumulate labels (`V0104`), so every edit is unambiguous.
- The planner reports the **worst-case re-prefill cost** (`W0210`): here, the tokens of `"\nTakeaway:"` plus up to 48 generated tokens. Splice early and that number is huge; splice right after the observation and it is small. The cost is visible at compile time.

## Structured output

Agents need machine-readable answers. **Constrained decoding** forces the model's output to match a grammar: at each step, tokens that would break the grammar get probability zero. JSON schemas and regular expressions compile to finite-state machines for this (SGLang's compressed FSMs, Outlines, XGrammar, llama.cpp grammars).

**In Veer:** constraints are part of `gen`, and the result is typed:

```veer
schema Bugs { count: int, items: [str<=80; <=8] }
let (c, bugs) = gen c ++ "List bugs as JSON:" max 256 as json<Bugs>
print(bugs.count)            // bugs: Bugs, a typed record

let (c, v) = gen c ++ "Promising?" max 4 as choice["yes", "no"]
```

The checker also proves the schema *can* fit: if the smallest valid `Bugs` value needs more tokens than `max`, that is error `V0116`.

## Branching search

**Tree of thought**, **best-of-N**, and **self-consistency** all explore several continuations of a shared prefix. With linear contexts this is just `fork` in a loop:

```veer
for i in 0..WIDTH {
  let (keep, branch) = fork root
  root = keep
  let (branch, thought) = gen branch ++ "\nNext step:" max 96
  ...
  drop branch
}
```

Each branch shares the root's cache, and the planner proves the peak memory of the whole search.

## Tools

Tools are declared with bounded result types, because their output is appended to contexts:

```veer
tool search(query: str<=128) -> str<=2048
```

At runtime a tool is bound to a shell command (`veer run --tool search='./search.sh'`). Its output is untrusted, so Veer enforces the declared bound by truncation. That is what makes the static memory bound hold even with arbitrary tool output.

Next: [5. Number formats →](/learn/number-formats/)
