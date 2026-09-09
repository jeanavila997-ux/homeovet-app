// HomeoVet MCP Server — expõe a base educacional para agentes de IA
// Protocolo MCP (Model Context Protocol) via stdio.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');

// Carrega a base (dist/base.json)
const BASE_PATH = path.join(__dirname, '..', '..', 'dist', 'base.json');
let base = null;
try {
  base = JSON.parse(fs.readFileSync(BASE_PATH, 'utf-8'));
} catch (e) {
  console.error('[HomeoVet MCP] base.json não encontrado — rode npm run build:backend');
  process.exit(1);
}

const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const server = new McpServer({
  name: 'homeovet',
  version: '0.1.0'
});

// Tool: buscar medicamentos
server.tool(
  'buscar_medicamentos',
  'Busca medicamentos homeopáticos na base educacional HomeoVet por nome, sintoma ou categoria.',
  { query: z.string().optional().describe('Termo de busca (nome, sintoma, categoria)'),
    categoria: z.string().optional().describe('Filtrar por categoria') },
  async ({ query = '', categoria = '' }) => {
    const q = norm(query);
    const meds = base.medicamentos.filter(m => {
      const okCat = !categoria || m.categoria === categoria;
      const alvo = norm([m.nome, m.nome_popular, m.categoria, (m.sintomas_homeopaticos || []).join(' ')].join(' '));
      return okCat && (!q || alvo.includes(q));
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(meds.slice(0, 20), null, 2) }]
    };
  }
);

// Tool: ficha de medicamento
server.tool(
  'ficha_medicamento',
  'Retorna a ficha completa de um medicamento homeopático (origem, potências, indicações, evidência).',
  { nome: z.string().describe('Nome do medicamento (ex.: Arnica Montana)') },
  async ({ nome }) => {
    const med = base.medicamentos.find(m => norm(m.nome) === norm(nome));
    if (!med) return { content: [{ type: 'text', text: 'Medicamento não encontrado.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(med, null, 2) }] };
  }
);

// Tool: listar categorias
server.tool(
  'listar_categorias',
  'Lista todas as categorias de medicamentos da base HomeoVet.',
  {},
  async () => {
    const cats = [...new Set(base.medicamentos.map(m => m.categoria))].sort();
    return { content: [{ type: 'text', text: cats.join('\n') }] };
  }
);

// Tool: evidencias
server.tool(
  'buscar_evidencias',
  'Busca evidências científicas sobre homeopatia veterinária na base HomeoVet.',
  { query: z.string().optional().describe('Termo de busca') },
  async ({ query = '' }) => {
    const q = norm(query);
    const evids = base.evidencias_cientificas.filter(e => {
      const alvo = norm([e.estudo, e.conclusao, e.nivel_evidencia].join(' '));
      return !q || alvo.includes(q);
    });
    return { content: [{ type: 'text', text: JSON.stringify(evids, null, 2) }] };
  }
);

// Tool: regulamentacao
server.tool(
  'buscar_regulamentacao',
  'Busca regulamentação brasileira sobre homeopatia veterinária (CFMV, MAPA, Anvisa).',
  { query: z.string().optional().describe('Termo de busca') },
  async ({ query = '' }) => {
    const q = norm(query);
    const regs = base.regulamentacao_brasil.filter(r => {
      const alvo = norm([r.aspecto, r.descricao, r.fonte].join(' '));
      return !q || alvo.includes(q);
    });
    return { content: [{ type: 'text', text: JSON.stringify(regs, null, 2) }] };
  }
);

// Tool: glossario
server.tool(
  'buscar_glossario',
  'Busca termos do glossário homeopático.',
  { termo: z.string().optional().describe('Termo a buscar') },
  async ({ termo = '' }) => {
    const q = norm(termo);
    const itens = Object.entries(base.glossario || {}).filter(([t, d]) => {
      const alvo = norm(t + ' ' + d);
      return !q || alvo.includes(q);
    });
    return { content: [{ type: 'text', text: JSON.stringify(Object.fromEntries(itens), null, 2) }] };
  }
);

// Inicia via stdio
const transport = new StdioServerTransport();
server.connect(transport);
console.error('[HomeoVet MCP] servidor rodando via stdio');
