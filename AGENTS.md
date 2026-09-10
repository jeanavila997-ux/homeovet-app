# Repository Guidelines

## Project Overview

HomeoVet — base educacional de homeopatia veterinária com 4 superfícies sobre uma única fonte de dados: web app React (deploy em GitHub Pages), API REST Express, desktop Electron e MCP server (para agentes de IA). Uso **estritamente educacional** — não diagnostica nem prescreve. Licença MIT.

## Architecture & Data Flow

Monorepo npm **sem workspaces**: 5 pacotes independentes (`package.json` próprio em cada um), orquestrados pela raiz via `npm --prefix`.

**Fonte de verdade dos dados:** a constante `BASE = {...}` (JSON de ~251KB) embutida em `frontend/src/index.html` — arquivo legado vanilla-JS. **Não edite dados em nenhum outro lugar.**

Fluxo:

1. `npm run build:backend` → `backend/scripts/gerar-base-json.js` extrai `const BASE` de `frontend/src/index.html` (parse por balanceamento de chaves) e grava `dist/base.json`. Aborta com `exit(1)` se o JSON for inválido.
2. `backend/src/server.js` e `mcp/src/server.js` carregam `dist/base.json` em memória no boot.
3. Frontend (`App.jsx`): `useEffect` → `fetch('/api/base')` → **fallback** `fetch('./base.json')` → fallback `setErro`. Em dev, proxy Vite `/api` → `localhost:3001`; em produção (Pages/Electron, sem backend) usa `./base.json` (offline-first).
4. Backend expõe 7 rotas GET (`/api/base`, `/api/medicamentos`, `/api/medicamentos/:nome`, `/api/categorias`, `/api/evidencias`, `/api/regulamentacao`, `/api/glossario`, `/api/health`). MCP expõe 6 tools via stdio (`buscar_medicamentos`, `ficha_medicamento`, `listar_categorias`, `buscar_evidencias`, `buscar_regulamentacao`, `buscar_glossario`).

Mudanças no comportamento de busca devem ser **replicadas em 3 lugares** — a função de normalização `norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()` está duplicada em `App.jsx`, `backend/src/server.js` e `mcp/src/server.js`.

## Key Directories

| Caminho | Propósito |
|---|---|
| `frontend/src/` | App React: `main.jsx` (bootstrap), `App.jsx` (UI completa), `styles.css`, `index.html` (fonte de dados `BASE`) |
| `backend/src/` | API Express |
| `backend/scripts/` | `gerar-base-json.js` (geração de `dist/base.json`) e variante `.py` legada (caminhos absolutos hardcoded — evitar) |
| `mcp/src/` | MCP server (SDK `@modelcontextprotocol/sdk`, transporte stdio, validação zod) |
| `electron/` | Shell desktop (`main.js`, BrowserWindow 1280×860, `contextIsolation: true`) |
| `dist/` | Saída de build (Vite + `base.json`) — publicada no Pages |
| `docs/` | `PLANO.md` (arquitetura em 5 fases) |

## Development Commands

Rodar sempre **na raiz**:

```bash
npm run install:all    # instala raiz + frontend + backend + mcp
npm run dev            # concurrently: backend (:3001) + frontend (:5173)
npm run build          # build:frontend (vite → ../dist) + build:backend (gera dist/base.json)
npm start              # backend apenas
npm run electron       # desktop (usa http://localhost:5173 em dev, ../dist/index.html em prod)
npm run mcp            # MCP server (stdio)
npm run deploy:pages   # gh-pages -d dist (deploy manual; CI também faz)
```

Não há scripts de lint, test, format ou typecheck.

## Code Conventions & Common Patterns

- **Naming:** camelCase para variáveis/funções (`busca`, `setBase`, `norm`); PascalCase para componentes React (`App`); UPPER_SNAKE para constantes (`BASE_PATH`, `PORT`, `DEV_URL`). **Campos de dados em snake_case** (`nome_popular`, `evidencias_cientificas`, `regulamentacao_brasil`).
- **Async:** frontend usa promises encadeadas `fetch().then().catch()` (não async/await); backend/MCP usam `async/await`. Sem axios — `fetch` nativo.
- **Erros:** backend → `res.status(503).json({error})` se base não carregada, `res.status(404)` para medicamento inexistente; `try/catch` no boot com `process.exit` em falha de carga. Frontend → `.catch()` seta estado `erro` e renderiza mensagem.
- **Estado React:** apenas `useState` local no `App` (`base`, `busca`, `categoria`, `aba`, `erro`). Sem Context/Redux/router — `App.jsx` é um componente monolítico único com JSX inline.
- **Modules:** frontend é ESM (`"type": "module"`); backend, mcp e electron são CommonJS.

## Important Files

- `frontend/src/index.html` — fonte de verdade dos dados (NÃO é o entry do Vite)
- `frontend/index.html` — entry HTML do Vite (`/src/main.jsx`)
- `backend/scripts/gerar-base-json.js` — pipeline de dados
- `backend/src/server.js` — API (porta `process.env.PORT || 3001`)
- `frontend/vite.config.js` — `base: './'` (build funciona em qualquer caminho), `outDir: '../dist'`, proxy `/api`
- `electron/main.js` — prod carrega `../dist/index.html`
- `.github/workflows/deploy-pages.yml` — CI
- `CNAME` — domínio `homeovet.vitrinedeapps.cloud`

## Runtime/Tooling Preferences

- **Node 20** (pinado no CI via `setup-node@v4`), **npm** como package manager (lockfiles na raiz e em `frontend/`; backend/mcp/electron não têm lockfile próprio).
- Instalação multi-pacote por `npm --prefix <pkg> install` — nunca configurar workspaces sem migrar os scripts.
- Env vars: `PORT` (backend, default 3001), `HOMEOVET_DEV_URL` (Electron dev, default `http://localhost:5173`), `NODE_ENV`. Não existe `.env.example`.
- Sem TypeScript, sem ESLint/Prettier, sem banco de dados (roadmap em `docs/PLANO.md` prevê SQLite).

## Testing & QA

**Não há infraestrutura de testes** — nenhum arquivo `*.test.*`/`*.spec.*`, nenhum framework (jest/vitest/playwright) e nenhum script de teste em nenhum `package.json`.

A única validação automatizada existente:
1. `backend/scripts/gerar-base-json.js` valida o JSON extraído de `BASE` e falha o build (`exit 1`) se inválido.
2. CI (`.github/workflows/deploy-pages.yml`, trigger: push em `main`): build do frontend → geração de `base.json` → cópia do CNAME → deploy no GitHub Pages. Sem etapa de teste.

Para verificar mudanças manualmente: `npm run build` (valida dados) e `npm run dev` (exercitar UI + API no navegador).