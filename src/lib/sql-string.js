export default (strings, ...values) => {
  // Interweave the strings with the
  // substitution vars first.
  let output = ''
  for (let i = 0; i < values.length; i += 1) {
    output += strings[i] + values[i]
  }
  output += strings[values.length]

  // Split on newlines.
  const lines = output.split(/(?:\r\n|\n|\r)/)

  // Rip out the leading whitespace.
  return lines.map(line => line.replace(/^\s+/gm, '')).join(' ').trim()
}
