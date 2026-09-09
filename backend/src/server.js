// HomeoVet Backend — API Express
// Serve a base educacional (JSON) e endpoints de busca.
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Carrega a base (gerada por scripts/gerar-base-json.js a partir do index.html)
const BASE_PATH = path.join(__dirname, '..', '..', 'dist', 'base.json');
let base = null;
try {
  base = JSON.parse(fs.readFileSync(BASE_PATH, 'utf-8'));
} catch (e) {
  console.warn('[HomeoVet] base.json não encontrado em', BASE_PATH, '— rode npm run build:backend');
}

app.use(cors());
app.use(express.json());

const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// GET /api/base — base completa
app.get('/api/base', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  res.json(base);
});

// GET /api/medicamentos?q=&categoria=
app.get('/api/medicamentos', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  const q = norm(req.query.q || '');
  const cat = req.query.categoria || '';
  const meds = base.medicamentos.filter(m => {
    const okCat = !cat || m.categoria === cat;
    const alvo = norm([m.nome, m.nome_popular, m.categoria, (m.sintomas_homeopaticos || []).join(' ')].join(' '));
    return okCat && (!q || alvo.includes(q));
  });
  res.json(meds);
});

// GET /api/medicamentos/:nome — ficha completa
app.get('/api/medicamentos/:nome', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  const med = base.medicamentos.find(m => norm(m.nome) === norm(req.params.nome));
  if (!med) return res.status(404).json({ error: 'Medicamento não encontrado' });
  res.json(med);
});

// GET /api/categorias
app.get('/api/categorias', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  res.json([...new Set(base.medicamentos.map(m => m.categoria))].sort());
});

// GET /api/evidencias
app.get('/api/evidencias', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  res.json(base.evidencias_cientificas);
});

// GET /api/regulamentacao
app.get('/api/regulamentacao', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  res.json(base.regulamentacao_brasil);
});

// GET /api/glossario
app.get('/api/glossario', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  res.json(base.glossario);
});

// GET /api/health
app.get('/api/health', (req, res) => res.json({ status: 'ok', versao: base?.metadata?.versao || '?' }));

app.listen(PORT, () => {
  console.log(`🐾 HomeoVet API rodando em http://localhost:${PORT}`);
  console.log(`   Base: ${base ? base.medicamentos.length + ' medicamentos' : 'NÃO CARREGADA'}`);
});
