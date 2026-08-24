import ply.lex as lex

tokens = (
	'LETTER',
	'CONJUCTION',
	'DISJUNCTION',
	'EQUIV',
	'NEGATION',
	'IMPLICATION',
	'LPAREN',
	'RPAREN',
)

t_LPAREN  = r'\('
t_RPAREN  = r'\)'

# Each of these accepts either the ASCII form or the equivalent unicode
# symbol (the frontend's palette inserts unicode) but normalizes
# t.value to one canonical spelling either way, so nothing downstream
# (CNF conversion, resolution) ever has to handle two spellings of the
# same operator. Order matters: EQUIV must come before IMPLICATION so
# "<->" isn't matched as "->" first.

def t_CONJUCTION(t):
	r'\&|∧'
	t.value = '&'
	return t

def t_NEGATION(t):
	r'\~|¬'
	t.value = '~'
	return t

def t_DISJUNCTION(t):
	r'\||∨'
	t.value = '|'
	return t

def t_EQUIV(t):
	r'<->|↔'
	t.value = '<->'
	return t

def t_IMPLICATION(t):
	r'->|→'
	t.value = '->'
	return t

def t_LETTER(t):
	r'[a-zA-Z][a-zA-Z0-9]*'
	return t

t_ignore  = ' \t'

class LexError(Exception):
	"""Raised on a character the lexer doesn't recognize. `position` is
	the character offset into the input string where it was found."""
	def __init__(self, character, position):
		self.character = character
		self.position = position
		super().__init__(f"Illegal character '{character}' at position {position}")

def t_error(t):
	raise LexError(t.value[0], t.lexpos)

lexer = lex.lex()

if __name__=='__main__':

	formula = input('prop. formula> ')
	lexer.input(formula)

	while True:
		tok = lexer.token()
		if not tok: 
			break
		print(tok)
