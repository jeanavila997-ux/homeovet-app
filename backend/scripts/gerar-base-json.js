// Gera dist/base.json a partir do index.html do HomeoVet (fonte de verdade)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', '..', 'homeovet', 'index.html');
const DEST = path.join(__dirname, '..', '..', 'dist', 'base.json');

if (!fs.existsSync(SRC)) {
  console.error('index.html não encontrado em', SRC);
  process.exit(1);
}

const html = fs.readFileSync(SRC, 'utf-8');
const m = html.match(/const BASE = (\{.*\});\r?\n/s);
if (!m) {
  console.error('BASE não encontrada no index.html');
  process.exit(1);
}

const base = JSON.parse(m[1]);
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, JSON.stringify(base, null, 2), 'utf-8');
console.log(`✅ base.json gerado: ${base.medicamentos.length} medicamentos, ${base.evidencias_cientificas.length} evidências, ${base.regulamentacao_brasil.length} regulamentações, ${Object.keys(base.glossario).length} termos`);
