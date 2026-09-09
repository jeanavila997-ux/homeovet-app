# 🐾 HomeoVet — Base Educacional de Homeopatia Veterinária

App web + desktop + MCP para consulta educacional de homeopatia veterinária: **124 medicamentos**, evidências científicas, regulamentação brasileira e glossário.

> ⚠️ **USO ESTRITAMENTE EDUCACIONAL** — NÃO diagnostica, NÃO prescreve, NÃO substitui o médico-veterinário.

## 🚀 Stack

| Camada | Tecnologia | Pasta |
|---|---|---|
| Frontend | React 18 + Vite | `frontend/` |
| Backend | Node.js + Express | `backend/` |
| Desktop | Electron | `electron/` |
| MCP Server | Model Context Protocol (SDK) | `mcp/` |
| Build estático | `dist/` (GitHub Pages) | `dist/` |

## 📦 Instalação

```bash
npm run install:all     # instala raiz + frontend + backend + mcp
npm run build           # gera dist/ (frontend + base.json)
npm run dev             # roda backend (3001) + frontend (5173) juntos
npm start               # só o backend
npm run electron        # app desktop
npm run mcp             # MCP server (stdio)
```

## 🌐 GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica `dist/` automaticamente a cada push na `main`.

URL: `https://jeanavila997-ux.github.io/homeovet-app/`

## 🤖 MCP para agentes

O MCP server expõe 6 tools para agentes de IA (Claude, Hermes, etc.):

- `buscar_medicamentos` — busca por nome/sintoma/categoria
- `ficha_medicamento` — ficha completa
- `listar_categorias` — todas as categorias
- `buscar_evidencias` — evidências científicas
- `buscar_regulamentacao` — CFMV/MAPA/Anvisa
- `buscar_glossario` — termos

Configuração no cliente MCP (ex.: Claude Desktop / Hermes):

```json
{
  "mcpServers": {
    "homeovet": {
      "command": "node",
      "args": ["C:/Users/JEANPC/homeovet-app/mcp/src/server.js"]
    }
  }
}
```

## 📁 Estrutura

```
homeovet-app/
├── frontend/          # React + Vite
│   └── src/           # App.jsx, main.jsx, styles.css
├── backend/           # Express API
│   ├── src/server.js  # API REST (/api/*)
│   └── scripts/       # gerar-base-json.js
├── electron/          # App desktop
├── mcp/               # MCP server (stdio)
├── dist/              # Build estático (GitHub Pages)
├── docs/              # Documentação
└── .github/workflows/ # CI/CD
```

## 🔌 API

| Rota | Descrição |
|---|---|
| `GET /api/base` | Base completa |
| `GET /api/medicamentos?q=&categoria=` | Busca medicamentos |
| `GET /api/medicamentos/:nome` | Ficha completa |
| `GET /api/categorias` | Lista categorias |
| `GET /api/evidencias` | Evidências |
| `GET /api/regulamentacao` | Regulamentação |
| `GET /api/glossario` | Glossário |
| `GET /api/health` | Health check |

## 📚 Conteúdo

- **124 medicamentos** (lista AMHB TEH 2025 + policrestos clássicos)
- **14 evidências científicas** (Embrapa, UFSC, Cochrane, MDPI, IJRH...)
- **10 regulamentações** (CFMV, MAPA, Anvisa 2024-2026)
- **23 termos de glossário** (miasmas, escalas, Homeopatia Populacional...)

## 🗺️ Roadmap

- [x] GitHub Pages (web estático)
- [x] API Express
- [x] MCP server
- [x] Electron desktop
- [ ] Domínio próprio (vitrinedeapps.cloud)
- [ ] Animações React (Framer Motion)
- [ ] Tutor IA com RAG (Ollama)
- [ ] Fichas dos produtos CMR/Real H

## 📄 Licença

MIT — Jean Avila
