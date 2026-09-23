// Build-time check: every KaTeX-delimited formula in the given HTML
// files must parse. Usage: node katex/check_math.js <file.html>...
const fs = require('fs');
const path = require('path');
const katex = require(path.join(__dirname, 'katex.min.js'));

const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                     .replace(/&amp;/g, '&');
let bad = 0;
for (const file of process.argv.slice(2)) {
  // Strip <script>/<style>/<pre>/<code> blocks and script-bearing tags:
  // auto-render skips them in the browser, so the checker must too
  // (the delimiter config itself contains a literal "\\(").
  const html = fs.readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>|<script[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(pre|code)[\s\S]*?<\/\1>/gi, '');
  const formulas = [];
  for (const m of html.matchAll(/\$\$([\s\S]+?)\$\$/g))
    formulas.push([m[1], true]);
  for (const m of html.matchAll(/\\\(([\s\S]+?)\\\)/g))
    formulas.push([m[1], false]);
  let ok = 0;
  for (const [tex, display] of formulas) {
    try {
      katex.renderToString(decode(tex),
        {displayMode: display, throwOnError: true, strict: false});
      ok++;
    } catch (e) {
      bad++;
      console.log(`FAIL ${path.basename(file)}: ${e.message}`);
      console.log(`  ${tex.trim().slice(0, 120)}`);
    }
  }
  console.log(`${path.basename(file)}: ${ok}/${formulas.length} formulas render`);
}
process.exit(bad ? 1 : 0);
