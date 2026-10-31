---
title: Error index
description: Every diagnostic Veer can emit.
sidebar:
  order: 0
---

Every error and warning has a code. Run `veer explain CODE` in a terminal, or open its page here. Codes `V00xx` are syntax, `V01xx` types and linearity, `V02xx` planner budgets, `V03xx` the precision layer, and `W` codes are warnings.

| Code | Meaning |
|---|---|
| [V0001](/errors/v0001/) | invalid token |
| [V0002](/errors/v0002/) | syntax error |
| [V0100](/errors/v0100/) | unknown name |
| [V0101](/errors/v0101/) | use of moved context |
| [V0102](/errors/v0102/) | context is never consumed |
| [V0103](/errors/v0103/) | branches disagree about a context |
| [V0104](/errors/v0104/) | loop changes context state |
| [V0105](/errors/v0105/) | context cannot be duplicated |
| [V0106](/errors/v0106/) | model mismatch |
| [V0110](/errors/v0110/) | type mismatch |
| [V0111](/errors/v0111/) | wrong number of arguments |
| [V0112](/errors/v0112/) | string bound exceeded |
| [V0113](/errors/v0113/) | unbounded loop |
| [V0114](/errors/v0114/) | recursion is not allowed |
| [V0115](/errors/v0115/) | unknown field |
| [V0116](/errors/v0116/) | structured output does not fit |
| [V0117](/errors/v0117/) | unbounded string appended to a context |
| [V0118](/errors/v0118/) | invalid declaration |
| [V0119](/errors/v0119/) | duplicate definition |
| [V0120](/errors/v0120/) | unknown span |
| [V0121](/errors/v0121/) | duplicate span label |
| [V0130](/errors/v0130/) | speculation must end in commit or rollback |
| [V0131](/errors/v0131/) | outer context used inside speculation |
| [V0132](/errors/v0132/) | statement not allowed here |
| [V0200](/errors/v0200/) | KV memory budget exceeded |
| [V0201](/errors/v0201/) | prefill budget exceeded |
| [V0202](/errors/v0202/) | context length exceeded |
| [W0210](/errors/w0210/) | splice forces re-prefill |
| [V0300](/errors/v0300/) | tensor shape mismatch |
| [V0301](/errors/v0301/) | accuracy bound violated |
| [V0302](/errors/v0302/) | possible overflow in number format |
| [V0303](/errors/v0303/) | unknown number format |
