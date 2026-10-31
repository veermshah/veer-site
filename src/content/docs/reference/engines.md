---
title: Engines
description: The simulated engine and the OpenAI-compatible HTTP engine (SGLang, vLLM, llama.cpp).
---

Both engines share one context store, so memory and token accounting are identical. They differ in how `gen` produces text.

## `sim` (default)

Deterministic placeholder text that depends only on the prompt, never exceeds `max` (under the byte measure), and honours `json<S>`, `choice[...]` and `stop`. Memory is accounted exactly as in the [memory model](/reference/contexts/). Use it to learn, test, and verify plans without a GPU.

## `http`

Sends each `gen` as `POST {endpoint}/v1/completions` with the context's full text as the prompt, `temperature: 0`, and `max_tokens`. Because contexts that share a prefix send byte-identical prefixes, the server's prefix cache (RadixAttention, vLLM automatic prefix caching, llama.cpp `cache_prompt`) gets hits for everything Veer shares. `--stats` shows the server-reported `cached_tokens` when available.

Structured output is mapped per `--dialect`:

| dialect | `json<S>` | `choice[...]` |
|---|---|---|
| `sglang` (default) | `json_schema` (string) | `regex` |
| `vllm` | `guided_json` | `guided_choice` |
| `llamacpp` | `json_schema` (object) | `json_schema` enum |
| `openai` | `response_format: json_schema` | `response_format` enum |

Field names for structured output differ across engine versions. If your server rejects a field, try another dialect or open an issue.

### Examples

```sh
# SGLang
python -m sglang.launch_server --model-path meta-llama/Llama-3.1-8B-Instruct --port 30000
veer run examples/review.veer --engine http --endpoint http://localhost:30000 --stats

# vLLM
vllm serve Qwen/Qwen2.5-7B-Instruct --enable-prefix-caching
veer run examples/tree_of_thought.veer --engine http --endpoint http://localhost:8000 --dialect vllm

# llama.cpp (runs on a laptop)
llama-server -m qwen2.5-0.5b-instruct-q8_0.gguf --port 8080
veer run examples/hello.veer --engine http --dialect llamacpp --model local
```

In HTTP mode, the memory figures in `--stats` are Veer's model of the engine's cache, not a measurement of the server.
