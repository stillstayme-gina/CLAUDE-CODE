/* body.part.html + css + js  →  index.html (개발용) / dist/index.html (Artifact용) */
import fs from 'node:fs';
import path from 'node:path';

const TITLE = '발밑의 시간';
const DESC = '한반도 지질을 내가 서 있는 자리에서 시작해 읽는 안내서.';
const FONTS = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700' +
              '&family=IBM+Plex+Sans+KR:wght@400;500;600' +
              '&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

const body = fs.readFileSync('assets/html/body.part.html', 'utf8').trimEnd();
const css = fs.readFileSync('assets/css/main.css', 'utf8').trimEnd();
const jsFiles = fs.readdirSync('assets/js').filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join('assets/js', f), 'utf8').trimEnd()).join('\n\n');

/* 1. 저장소용 — 파일을 나눠 참조 */
fs.writeFileSync('index.html',
`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="assets/css/main.css">
</head>
<body>
${body}
${jsFiles.map(f => `<script src="assets/js/${f}"></script>`).join('\n')}
</body>
</html>
`);

/* 2. Artifact용 — 단일 파일. doctype/head/body 래퍼는 발행 시 씌워집니다. */
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html',
`<title>${TITLE}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
${css}
</style>
${body}
<script>
${js}
</script>
`);

const kb = n => (n / 1024).toFixed(1) + 'KB';
console.log('index.html      ', kb(fs.statSync('index.html').size));
console.log('dist/index.html ', kb(fs.statSync('dist/index.html').size), `(js ${jsFiles.length}개 인라인)`);
