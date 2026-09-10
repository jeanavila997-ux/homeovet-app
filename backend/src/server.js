// HomeoVet Backend — API Express otimizada
// Serve a base educacional (JSON) e endpoints de busca com cache e compressão.
const express = require('express');
const cors = require('cors');
const compression = require('compression');
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

// Middleware de compressão gzip para reduzir tamanho das respostas
app.use(compression());
app.use(cors());
app.use(express.json());

// Cache de dados derivados para evitar recálculos
let cachedCategorias = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 1 minuto

// Função de normatização otimizada com cache
const normCache = new Map();
const norm = (s) => {
  if (!s) return '';
  if (normCache.has(s)) return normCache.get(s);
  const normalized = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  normCache.set(s, normalized);
  return normalized;
};

// Invalida cache quando necessário
const invalidateCache = () => {
  cachedCategorias = null;
  lastCacheTime = 0;
  normCache.clear();
};

// GET /api/base — base completa com cache HTTP
app.get('/api/base', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  
  // Cache headers para o cliente
  res.set('Cache-Control', 'public, max-age=300');
  res.set('ETag', `"${base.metadata?.versao || 'unknown'}"`);
  
  // Suporte a conditional requests
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === res.get('ETag')) {
    return res.status(304).send();
  }
  
  res.json(base);
});

// GET /api/medicamentos?q=&categoria= com otimização
app.get('/api/medicamentos', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  const q = norm(req.query.q || '');
  const cat = req.query.categoria || '';
  
  // Otimização: early return se não há filtro
  if (!q && !cat) {
    return res.json(base.medicamentos);
  }
  
  const meds = base.medicamentos.filter(m => {
    const okCat = !cat || m.categoria === cat;
    if (!okCat) return false;
    if (!q) return true;
    const alvo = norm([
      m.nome, 
      m.nome_popular, 
      m.categoria, 
      (m.sintomas_homeopaticos || []).join(' ')
    ].join(' '));
    return alvo.includes(q);
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

// GET /api/categorias com cache
app.get('/api/categorias', (req, res) => {
  if (!base) return res.status(503).json({ error: 'Base não carregada' });
  
  const now = Date.now();
  if (cachedCategorias && (now - lastCacheTime) < CACHE_TTL) {
    res.set('Cache-Control', `public, max-age=${Math.floor((CACHE_TTL - (now - lastCacheTime)) / 1000)}`);
    return res.json(cachedCategorias);
  }
  
  cachedCategorias = [...new Set(base.medicamentos.map(m => m.categoria))].sort();
  lastCacheTime = now;
  res.set('Cache-Control', `public, max-age=${Math.floor(CACHE_TTL / 1000)}`);
  res.json(cachedCategorias);
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
app.get('/api/health', (req, res) => res.json({ 
  status: 'ok', 
  versao: base?.metadata?.versao || '?',
  timestamp: Date.now()
}));

// Endpoint para invalidar cache (útil após atualizações)
app.post('/api/cache/invalidate', (req, res) => {
  invalidateCache();
  res.json({ status: 'ok', message: 'Cache invalidado' });
});

app.listen(PORT, () => {
  console.log(`🐾 HomeoVet API rodando em http://localhost:${PORT}`);
  console.log(`   Base: ${base ? base.medicamentos.length + ' medicamentos' : 'NÃO CARREGADA'}`);
  console.log(`   Compressão: habilitada`);
  console.log(`   Cache de categorias: ${CACHE_TTL}ms`);
});
