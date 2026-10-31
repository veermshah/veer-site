---
title: Limitations and roadmap
description: What Veer does not do yet, stated plainly.
---

## Current limitations

- **Token bounds use bytes.** Sound but loose (about 4× for English). Exact tokenizer-aware bounds are planned (load `tokenizer.json`).
- **Bounds are worst case.** Both the memory planner and the error analysis assume adversarial outcomes. Probabilistic or typical-case bounds would be tighter but not guarantees.
- **The HTTP engine re-sends full prompts.** Sharing is realized through the server's prefix cache, not a native KV-handle API. `splice` on HTTP sends the edited text, and the server re-prefills from the first differing token.
- **No position-corrected splicing yet.** The planner reports re-prefill cost. Engines with Leyline-style editing could avoid it.
- **Plan hints aren't consumed by engines yet.** `reuse_hints` and the DAG are emitted as JSON for engine integration.
- **The tensor layer is a CPU reference.** It checks formats and bounds and simulates quantization bit-exactly. It doesn't generate GPU kernels.
- **Loops need constant bounds** and recursion is forbidden. Both are deliberate.
- **Error recovery** stops at the first parse error.
- **No language server** or editor extension yet.

## Roadmap

1. Tokenizer-exact bounds.
2. Native engine integration: pass the plan's DAG and reuse hints to SGLang or vLLM schedulers, and use KV-handle APIs instead of re-sent prompts.
3. Position-corrected `splice` on engines that support it.
4. A WASM playground on the website (`check` and `plan` in the browser).
5. Language server with inline plan annotations.
6. Probabilistic error bounds, attention and softmax rules, and per-channel scales.
