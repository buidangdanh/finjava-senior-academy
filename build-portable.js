/* Đóng gói toàn bộ FinJava Senior Academy thành 1 file HTML duy nhất (Single-File Portable) để gửi Zalo/Drive hoặc mở offline mọi nơi */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const scripts = [
  'data.js',
  'content/lessons-j.js',
  'content/lessons-s.js',
  'content/lessons-d.js',
  'content/lessons-m.js',
  'content/lessons-b.js',
  'content/lessons-k.js',
  'content/lessons-f.js',
  'content/lessons-o.js',
  'content/lessons-a.js',
  'content/lessons-c.js',
  'content/examples-j-s.js',
  'content/examples-d-m.js',
  'content/examples-b-k.js',
  'content/examples-f-o.js',
  'content/examples-a-c.js',
  'content/exams-r1-r2.js',
  'content/exams-r3-r4.js',
  'content/interview-sim.js',
  'app.js'
];

const inlineJs = scripts
  .map(rel => {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) {
      console.warn('Missing:', rel);
      return `/* missing ${rel} */`;
    }
    // Escape </script> safely inside JS literals if any
    return `/* === ${rel} === */\n` + fs.readFileSync(p, 'utf8').replace(/<\/script>/gi, '<\\/script>');
  })
  .join('\n\n');

const outHtml = `<!doctype html>
<html lang="vi" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0b1f3a">
  <title>FinJava Senior (Bản All-in-One) | Java Backend Senior Tài Chính - Ngân Hàng</title>
  <style>${css}</style>
</head>
<body>
  <div id="root">Đang tải FinJava Senior Academy…</div>
  <script>
${inlineJs}
  </script>
</body>
</html>`;

const outPath = path.join(ROOT, 'finjava-portable-all-in-one.html');
fs.writeFileSync(outPath, outHtml, 'utf8');
console.log('Built portable single-file HTML:', outPath, 'Size:', (Buffer.byteLength(outHtml, 'utf8') / 1024 / 1024).toFixed(2), 'MB');
