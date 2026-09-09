// Gera dist/base.json a partir do index.html do HomeoVet (fonte de verdade)
// Usa indexOf (robusto contra CRLF e JSON minificado)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', '..', 'homeovet', 'index.html');
const DEST = path.join(__dirname, '..', '..', 'dist', 'base.json');

if (!fs.existsSync(SRC)) {
  console.error('index.html não encontrado em', SRC);
  process.exit(1);
}

const html = fs.readFileSync(SRC, 'utf-8');
const inicio = html.indexOf('const BASE = ');
if (inicio === -1) {
  console.error('BASE não encontrada no index.html');
  process.exit(1);
}

// Pula o prefixo "const BASE = " e captura até o ";" que fecha a declaração
const jsonStart = inicio + 'const BASE = '.length;
// Encontra o fim do JSON por balanceamento de chaves (robusto contra CRLF e código JS depois)
let profundidade = 0, fim = -1, emString = false, escape = false;
for (let i = jsonStart; i < html.length; i++) {
  const c = html[i];
  if (emString) {
    if (escape) escape = false;
    else if (c === '\\') escape = true;
    else if (c === '"') emString = false;
    continue;
  }
  if (c === '"') { emString = true; continue; }
  if (c === '{') profundidade++;
  else if (c === '}') {
    profundidade--;
    if (profundidade === 0) { fim = i; break; }
  }
}
if (fim === -1) {
  console.error('Fim da BASE não encontrado');
  process.exit(1);
}

const jsonStr = html.slice(jsonStart, fim + 1);
let base;
try {
  base = JSON.parse(jsonStr);
} catch (e) {
  console.error('JSON inválido:', e.message.slice(0, 200));
  process.exit(1);
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, JSON.stringify(base, null, 2), 'utf-8');
console.log(`OK: base.json gerado — ${base.medicamentos.length} medicamentos, ${base.evidencias_cientificas.length} evidências, ${base.regulamentacao_brasil.length} regulamentações, ${Object.keys(base.glossario).length} termos`);
