/** Render the API's bounded RPN expressions as infix notation; never execute code. */
export function formatEvolutionExpression(expression: string): string | null {
  const tokens = expression.trim().split(/\s+/)
  if (!expression.trim() || expression.length > 2000 || tokens.length > 200) return null
  const stack: string[] = []
  const operators: Record<string, string> = {
    '==': '=',
    '!=': '≠',
    '>=': '≥',
    '<=': '≤',
    '>': '>',
    '<': '<',
    '%': 'mod',
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
    '&&': '∧',
    '||': '∨',
    '&': '&',
    '|': '|',
    '^': '⊕',
  }
  for (const token of tokens) {
    if (/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(token) || /^-?\d{1,12}(\.\d{1,6})?$/.test(token)) stack.push(token)
    else if (Object.hasOwn(operators, token)) {
      if (stack.length < 2) return null
      const right = stack.pop()!
      const left = stack.pop()!
      stack.push(`(${left} ${operators[token]} ${right})`)
    } else if (token === '!' && stack.length) stack.push(`¬${stack.pop()}`)
    else return null
  }
  return stack.length === 1 ? stack[0] : null
}
