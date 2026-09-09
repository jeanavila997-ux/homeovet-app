# HomeoVet — Plano de Arquitetura

## Visão

App educacional de homeopatia veterinária com 4 superfícies:
1. **Web (GitHub Pages)** — estático, React, sem backend
2. **Web + API** — backend Express para busca dinâmica
3. **Desktop (Electron)** — app local com a base embutida
4. **Agentes (MCP)** — tools para IA consumir a base

## Fases

### Fase 1 — GitHub Pages (atual)
- React + Vite, base.json embutido no build
- Deploy automático via GitHub Actions
- URL: `https://jeanavila997-ux.github.io/homeovet-app/`

### Fase 2 — Domínio próprio
- Apontar domínio (ex.: homeovet.vitrinedeapps.cloud) para GitHub Pages
  - DNS: CNAME `homeovet` → `jeanavila997-ux.github.io`
  - Repo Settings → Pages → Custom domain
- Alternativa: Hostinger (avilamix.shop) com deploy via SSH

### Fase 3 — Electron + animações
- Framer Motion para animações React
- Electron empacotado (electron-builder): Windows .exe
- Base embutida no app (offline-first)

### Fase 4 — Backend completo
- Express + busca full-text
- Tutor IA com RAG (Ollama local ou API)
- Persistência (SQLite) para favoritos/notas

### Fase 5 — MCP + agentes
- MCP server stdio (já criado)
- Integração com Hermes/Claude Desktop
- Tools: buscar_medicamentos, ficha_medicamento, listar_categorias, buscar_evidencias, buscar_regulamentacao, buscar_glossario

## Decisões

- `base: './'` no Vite → build funciona em qualquer caminho (Pages, file://, Electron)
- base.json gerado do index.html (fonte de verdade única)
- API com fallback para base.json estático (offline-first)
- MCP via stdio (sem rede, sem auth)
