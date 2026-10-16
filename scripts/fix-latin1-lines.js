/**
 * Re-encodes lines that are not valid UTF-8 (saved as Windows-1252) to UTF-8, leaving valid
 * lines untouched. Usage: node scripts/fix-latin1-lines.js <file> [...]
 */
const fs = require('fs');

const utf8 = new TextDecoder('utf-8', { fatal: true });
const cp1252 = new TextDecoder('windows-1252');

for (const file of process.argv.slice(2)) {
  const buf = fs.readFileSync(file);
  const out = [];
  let start = 0;
  let fixed = 0;
  for (let i = 0; i <= buf.length; i++) {
    if (i === buf.length || buf[i] === 10) {
      const line = buf.subarray(start, i);
      try {
        utf8.decode(line);
        out.push(Buffer.from(line));
      } catch (e) {
        out.push(Buffer.from(cp1252.decode(line), 'utf8'));
        fixed += 1;
      }
      if (i < buf.length) out.push(Buffer.from([10]));
      start = i + 1;
    }
  }
  const result = Buffer.concat(out);
  utf8.decode(result); // throws if anything is still invalid
  fs.writeFileSync(file, result);
  console.log(`${file}: re-encoded ${fixed} line(s)`);
}
