---
title: 3. Structured generation
description: Typed JSON output with schemas, constrained choices, and stop strings.
---

## JSON with a schema

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128 }

schema Review {
  score: int,
  verdict: str<=40,
  issues: [str<=80; <=5],
}

fn main() {
  let c = open llama ++ "Review this function: fn add(a, b) { a - b }\nAnswer in JSON."
  let (c, r) = gen c max 300 as json<Review>
  print(r.score, r.verdict)
  for issue in r.issues {
    print("-", issue)
  }
  drop c
}
```

- `r` has type `Review`, a typed record. `r.score` is an `int`, and `r.issues` is a list of at most 5 strings.
- On a real server the schema is sent as a JSON Schema for **constrained decoding** (see [Engines](/reference/engines/)), so the output always parses.
- If the smallest valid `Review` couldn't fit in `max` tokens, the checker rejects it (`V0116`).
- `for issue in r.issues` iterates a bounded list. The bound (5) is what lets the planner bound the loop.

## Choices

For classification, constrain the output to a fixed set:

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128 }

fn main() {
  let c = open llama ++ "Is 'the cache is warm' positive or negative?"
  let (c, label) = gen c max 8 as choice["positive", "negative"]
  if label == "positive" { print("👍") } else { print("👎") }
  drop c
}
```

## Stop strings

```veer
model llama = "meta-llama/Llama-3.1-8B-Instruct" { layers: 32, kv_heads: 8, head_dim: 128 }

fn main() {
  let (c, line) = gen open llama ++ "Write one line:" max 40 stop "\n"
  print(line)
  drop c
}
```

Note that `gen open llama ++ "..."` is fine: `open` produces a fresh context that `++` consumes immediately.

Next: [4. Editing contexts with splice →](/tutorial/splice/)
