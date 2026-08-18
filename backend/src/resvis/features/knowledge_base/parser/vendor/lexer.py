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

t_CONJUCTION    = r'\&'
t_NEGATION  = r'\~'
t_DISJUNCTION   = r'\|'
t_EQUIV   = r'<->'
t_IMPLICATION = '->'
t_LPAREN  = r'\('
t_RPAREN  = r'\)'

def t_LETTER(t):
	r'(\d\-)*[a-zA-Z](\d,\d)*'
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
