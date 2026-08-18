from parser import parser

if __name__=='__main__':
	filename = 'input.txt'
	kb_lines = open(filename, 'r').readlines()

	for line in kb_lines:
		line = line.strip()

		print('Input: ', line)
		parsed_line = parser.parse(line.strip()) #Note: output is not a string, see line 13
		print('Parsed line: ', parsed_line)
		#print(type(parsed_line))
		print('\n-----------')