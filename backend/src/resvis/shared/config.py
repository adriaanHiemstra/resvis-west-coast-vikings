MAX_FORMULA_LENGTH = 500
"""Upper bound on a single formula's character length - this will protect against slow parses and formulas that are too long, as well as Python's recursion limit (Risk 2 Mitigation)"""

MAX_FORMULA_NESTING_DEPTH = 50
"""Upper bound on how many levels deep a single formula's parse tree may nest (Risk 2 Mitigation).

MAX_FORMULA_LENGTH alone doesn't bound nesting: the vendored grammar lets
a bare negation add one level of depth per character (e.g. "~~~~~P"), so
a 500-character formula can still nest ~499 levels deep without ever
tripping the length check. Parsing itself is safe either way (the
vendored parser is a table-driven PLY/yacc parser, not recursive
descent), but every piece of code that walks the resulting tree - the
existing tree_serializer.serialize_node, and the CNF converter and
resolution engine still to come - does so via plain Python recursion,
so nesting depth translates directly into call-stack depth. A future
recursive pass (e.g. pushing negations inward while building CNF) can
easily spend more than one stack frame per tree level. Python's default
recursion ceiling is 1000 (sys.getrecursionlimit()), so 50 leaves at
least a 10-20x safety margin even under several stacked frames per
level, while comfortably covering any hand-authored admissions-logic
formula - these bottom out well under 10 levels of nesting in practice.
"""

MAX_FORMULAS_PER_KNOWLEDGE_BASE = 200
"""Upper bound on how many formulas a single knowledge base (or query batch) may contain (Risk 2 + Risk 5 mitigation).

Committee members hand-author facts about one student at a time, so a
real knowledge base is realistically dozens of formulas, not thousands
- and Use Case 1 requires a human to visually review every clause
before confirming it, which stops being a usable review screen well
before this limit. Capping the count at the input boundary also keeps
the downstream workload bounded before ResolutionEngine.stepLimit even
needs to kick in: each formula can expand into multiple CNF clauses,
and resolution's clause-pair comparisons scale with the square of the
clause count, so an oversized free-text KB upload is a cheap way to
make /knowledge-base/parse (and everything downstream of it) very slow.
"""