---
title: CLI
description: Every veer subcommand and flag.
---

```text
veer check <file>                 type-check + plan; exit 1 on errors
veer plan  <file> [--entry F] [--json]
veer run   <file> [--entry main] [--engine sim|http] [--endpoint URL]
                  [--dialect sglang|vllm|llamacpp|openai] [--model ID]
                  [--tool NAME=CMD]... [--arg NAME=VALUE]... [--stats]
veer types <file>                 inferred signatures (with tensor bounds)
veer explain [CODE] [--markdown-dir DIR]
veer --version
```

## `veer run`

- `--arg doc=@notes.txt` reads a file. `--arg n=3` parses by the parameter's type. String arguments must fit their declared bound.
- `--tool search='python search.py'` binds a declared tool to a shell command. Arguments are passed as a JSON object on stdin and as `VEER_ARG_<NAME>` environment variables, and stdout is the result (truncated to the declared bound). Unbound tools return a deterministic placeholder.
- `--stats` prints measured engine statistics next to the plan: peak KV, prefill and decode tokens, reused tokens, and (HTTP) server-reported prompt and cached tokens.
- `VEER_API_KEY` or `OPENAI_API_KEY` is sent as a bearer token if set.

Exit codes: `0` ok, `1` compile error, `2` usage/IO error, `3` runtime error.

## `veer plan --json`

An array of plans (one per planned function) with fields `entry`, `peak_kv_bytes`, `live_at_peak`, `prefill_tokens`, `decode_tokens`, `models`, `forks`, `splices`, `trace` (the context DAG), `reuse_hints`, and `segments`. Intended for engines, dashboards, and CI checks.
