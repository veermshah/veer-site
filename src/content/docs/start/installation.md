---
title: Installation
description: Install the veer toolchain on macOS, Windows, or Linux.
---

The fastest way is the [Download page](/download/), which detects your OS. Or use a one-line installer:

**macOS and Linux**

```sh
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/veermshah/veer-site/releases/latest/download/veer-cli-installer.sh | sh
```

**Windows (PowerShell)**

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://github.com/veermshah/veer-site/releases/latest/download/veer-cli-installer.ps1 | iex"
```

Windows users can also download the `.msi` installer from the [Download page](/download/).

## Check it works

```sh
veer --version
veer explain V0101
```

## Editor support

Veer files use the `.veer` extension. There is no language server yet. Rust or TypeScript syntax highlighting is a reasonable stand-in until there is (see the [roadmap](/reference/limitations/)).

## Running against a real model

`veer run` uses the built-in **simulated engine** by default, so you can learn the language with no GPU. To use a real model, start any OpenAI-compatible server and pass `--engine http`. See [Engines](/reference/engines/). For example, on a Mac with [llama.cpp](https://github.com/ggml-org/llama.cpp):

```sh
llama-server -m qwen2.5-0.5b-instruct-q8_0.gguf --port 8080
veer run hello.veer --engine http --endpoint http://localhost:8080 --dialect llamacpp
```
