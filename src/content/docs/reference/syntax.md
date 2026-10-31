---
title: Syntax
description: Lexical structure and the complete grammar of Veer in EBNF.
---

## Lexical structure

- **Comments**: `//` to end of line.
- **Identifiers**: `[A-Za-z_][A-Za-z0-9_]*`. `_` alone is the wildcard pattern.
- **Integers**: `42`, `1_000`. In attributes only, an integer may carry a unit suffix: `2GiB`, `512MiB`, `64KB`.
- **Floats**: `0.5`, `1e-3`, `2.5E+4`.
- **Strings**: `"..."` with escapes `\n \t \r \" \\`. Strings may span lines.
- **Statements** are separated by newlines or `;`. A `(` or `[` on a new line starts a new statement rather than a call or index, and so does `@`.

**Keywords:** `model prefix tool schema const fn let return fork gen max as json choice stop drop splice at with speculate commit rollback if else for in open true false`

**Type names** (`str int float bool Ctx Tensor`) and **format names** (`f32 bf16 f16 fp8_e4m3 fp8_e5m2 int8 mxfp4 mxfp4_oas nvfp4`) are ordinary identifiers with special meaning.

## Grammar

```ebnf
program     = { item } ;
item        = model | prefix | tool | schema | const | { attr } fn ;

model       = "model" IDENT "=" STRING "{" [ mfield { "," mfield } [","] ] "}" ;
mfield      = IDENT ":" ( INT | IDENT ) ;          (* layers kv_heads head_dim kv block max_ctx *)
prefix      = "prefix" IDENT ":" IDENT "=" STRING ;
tool        = "tool" IDENT params "->" type ;
schema      = "schema" IDENT "{" [ IDENT ":" type { "," IDENT ":" type } [","] ] "}" ;
const       = "const" IDENT "=" expr ;
attr        = "@" IDENT [ "(" [ aarg { "," aarg } ] ")" ] ;
aarg        = IDENT ( "=" | "<=" ) ( INT [UNIT] | FLOAT ) ;
fn          = "fn" IDENT params [ "->" type ] block ;
params      = "(" [ IDENT ":" type { "," IDENT ":" type } ] ")" ;

type        = "str" [ "<=" INT ] | "int" | "float" | "bool"
            | "Ctx" "<" IDENT ">"
            | "Tensor" "<" "[" [ INT { "," INT } ] "]" "," IDENT
                  [ "," "abs" "<=" NUM ] [ "," "err" "<=" NUM ] ">"
            | "(" [ type { "," type } ] ")"
            | "[" type ";" [ "<=" ] INT "]"
            | IDENT ;                                       (* schema name *)

block       = "{" { stmt [";"] } "}" ;
stmt        = "let" pattern [ ":" type ] "=" expr
            | pattern "=" expr                              (* assignment *)
            | "drop" expr { "," expr }
            | "return" [ expr ]
            | "if" expr block [ "else" ( block | if ) ]
            | "for" IDENT "in" ( expr ".." expr | expr ) block
            | "commit" expr | "rollback" expr
            | expr ;
pattern     = IDENT | "_" | "(" pattern { "," pattern } ")" ;

expr        = pipe ;
pipe        = or { "|>" IDENT [ args ] } ;                  (* x |> f(a)  ==  f(x, a) *)
or          = and { "||" and } ;
and         = cmp { "&&" cmp } ;
cmp         = append { ( "==" | "!=" | "<" | "<=" | ">" | ">=" ) append } ;
append      = add { "++" [ "#[" IDENT "]" ] add } ;          (* append text to a context *)
add         = mul { ( "+" | "-" ) mul } ;
mul         = unary { ( "*" | "/" | "@" ) unary } ;
unary       = ( "-" | "!" ) unary
            | "open" IDENT
            | "fork" append
            | "gen" append "max" add [ "as" ( "json" "<" IDENT ">" | "choice" "[" STRING { "," STRING } "]" ) ] [ "stop" add ]
            | "splice" append "at" IDENT "with" [ "#[" IDENT "]" ] add
            | "speculate" postfix block
            | postfix ;
postfix     = primary { args | "." IDENT | "[" expr "]" } ;
args        = "(" [ expr { "," expr } ] ")" ;
primary     = INT | FLOAT | STRING | "true" | "false" | IDENT
            | "(" ")" | "(" expr ")" | "(" expr "," [ expr { "," expr } ] ")"
            | "[" [ expr { "," expr } ] "]" ;                (* tensor shapes only *)
```

## Precedence (loosest first)

| level | operators |
|---|---|
| 1 | `\|>` |
| 2 | `\|\|` |
| 3 | `&&` |
| 4 | `== != < <= > >=` |
| 5 | `++` (left-assoc; `c ++ "a" ++ "b"` appends twice) |
| 6 | `+ -` |
| 7 | `* / @` |
| 8 | unary `- !`, `open`, `fork`, `gen`, `splice`, `speculate` |
| 9 | call, field, index |

Because `++` is looser than `+`, `c ++ "Q: " + q` appends the concatenated string as **one** segment, while `c ++ "Q: " ++ q` appends two segments.
