import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// HomeoVet — React frontend com animações (Framer Motion)
// Carrega a base educacional (JSON) e renderiza com busca, categorias e abas.
// Fallback: se a API não responder, usa o JSON embutido (modo offline/GitHub Pages).

const FALLBACK = window.__HOMEOVET_BASE__ || null;

// Variantes de animação (memoizadas para evitar recriação)
const fadeUp = Object.freeze({
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' }
  })
});

const abaAnim = Object.freeze({
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.15 } }
});

// Função de normatização otimizada (cache simples)
const normCache = new Map();
const norm = (s) => {
  if (!s) return '';
  if (normCache.has(s)) return normCache.get(s);
  const normalized = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  normCache.set(s, normalized);
  return normalized;
};

// Componente de Card memoizado para evitar re-renders desnecessários
const MedicamentoCard = memo(({ m, index }) => (
  <motion.div
    className="card"
    custom={index}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    whileHover={{ scale: 1.03, borderColor: 'var(--accent)' }}
    whileTap={{ scale: 0.98 }}
  >
    <h3>{m.nome}</h3>
    <div className="pop">{m.nome_popular || ''}</div>
    <span className="cat">{m.categoria}</span>
    <p>{(m.indicacoes_fabricante || '').slice(0, 140)}…</p>
    <span className="tag-evid">🔬 {(m.evidencia_cientifica || '').slice(0, 60)}…</span>
  </motion.div>
));

MedicamentoCard.displayName = 'MedicamentoCard';

// Componente de Item de Evidência memoizado
const EvidenciaItem = memo(({ e, index }) => (
  <motion.div
    className="item"
    key={e.estudo}
    custom={index}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
  >
    <h3>{e.estudo}</h3>
    <div className="meta">{e.nivel_evidencia}</div>
    <p>{e.conclusao}</p>
    <p><small>Relevância: {e.relevancia}</small></p>
  </motion.div>
));

EvidenciaItem.displayName = 'EvidenciaItem';

// Componente de Item de Regulamentação memoizado
const RegulamentacaoItem = memo(({ r, index }) => (
  <motion.div
    className="item"
    key={r.aspecto}
    custom={index}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
  >
    <h3>{r.aspecto}</h3>
    <div className="meta">{r.fonte} · Status: {r.status}</div>
    <p>{r.descricao}</p>
  </motion.div>
));

RegulamentacaoItem.displayName = 'RegulamentacaoItem';

// Componente de entrada do Glossário memoizado
const GlossarioEntry = memo(({ termo, definicao, index }) => (
  <motion.div key={termo} custom={index} variants={fadeUp} initial="hidden" animate="visible">
    <dt>{termo}</dt>
    <dd>{definicao}</dd>
  </motion.div>
));

GlossarioEntry.displayName = 'GlossarioEntry';

export default function App() {
  const [base, setBase] = useState(FALLBACK);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [aba, setAba] = useState('meds');
  const [erro, setErro] = useState('');

  // Carregamento da base com debounce implícito
  useEffect(() => {
    if (base) return;
    let cancelled = false;
    
    const loadBase = async () => {
      try {
        const r = await fetch('/api/base');
        if (!r.ok) throw new Error('API indisponível');
        const d = await r.json();
        if (!cancelled) setBase(d);
      } catch {
        try {
          const r = await fetch('./base.json');
          if (!r.ok) throw new Error('sem base.json');
          const d = await r.json();
          if (!cancelled) setBase(d);
        } catch (e) {
          if (!cancelled) setErro('Base não carregada: ' + e.message);
        }
      }
    };
    
    loadBase();
    return () => { cancelled = true; };
  }, [base]);

  // Callbacks memoizados
  const handleBuscaChange = useCallback((e) => setBusca(e.target.value), []);
  const handleCategoriaChange = useCallback((e) => setCategoria(e.target.value), []);
  const handleAbaChange = useCallback((id) => setAba(id), []);

  if (erro) return <div className="vazio">{erro}</div>;
  if (!base) return (
    <motion.div className="vazio" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      Carregando base educacional…
    </motion.div>
  );

  // Dados derivados memoizados para evitar recálculos desnecessários
  const q = useMemo(() => norm(busca.trim()), [busca]);
  
  const cats = useMemo(() => 
    [...new Set(base.medicamentos.map(m => m.categoria))].sort(),
    [base.medicamentos]
  );

  const meds = useMemo(() => {
    return base.medicamentos.filter(m => {
      const okCat = !categoria || m.categoria === categoria;
      if (!okCat) return false;
      if (!q) return true;
      const alvo = norm([
        m.nome, 
        m.nome_popular, 
        m.categoria, 
        (m.sintomas_homeopaticos || []).join(' '), 
        m.indicacoes_fabricante
      ].join(' '));
      return alvo.includes(q);
    });
  }, [base.medicamentos, categoria, q]);

  const evids = useMemo(() => {
    if (!q) return base.evidencias_cientificas;
    return base.evidencias_cientificas.filter(e => {
      const alvo = norm([e.estudo, e.conclusao, e.nivel_evidencia].join(' '));
      return alvo.includes(q);
    });
  }, [base.evidencias_cientificas, q]);

  const regs = useMemo(() => {
    if (!q) return base.regulamentacao_brasil;
    return base.regulamentacao_brasil.filter(r => {
      const alvo = norm([r.aspecto, r.descricao, r.fonte].join(' '));
      return alvo.includes(q);
    });
  }, [base.regulamentacao_brasil, q]);

  const gloss = useMemo(() => {
    const entries = Object.entries(base.glossario || {});
    if (!q) return entries;
    return entries.filter(([t, d]) => {
      const alvo = norm(t + ' ' + d);
      return alvo.includes(q);
    });
  }, [base.glossario, q]);

  return (
    <div className="wrap">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>🐾 Homeo<span>Vet</span></h1>
        <p>Base educacional de homeopatia veterinária — busca, evidências e regulamentação</p>
        <span className="badge-edu">⚠️ USO ESTRITAMENTE EDUCACIONAL — NÃO diagnostica, NÃO prescreve, NÃO substitui o médico-veterinário</span>
      </motion.header>

      <motion.div
        className="toolbar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <input 
          type="search" 
          placeholder="🔎 Buscar: remédio, sintoma, termo, estudo..." 
          value={busca} 
          onChange={handleBuscaChange}
          aria-label="Buscar"
        />
        <select value={categoria} onChange={handleCategoriaChange} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias ({cats.length})</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </motion.div>

      <motion.nav
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        role="tablist"
        aria-label="Navegação entre seções"
      >
        {[
          ['meds', `💊 Medicamentos (${base.medicamentos.length})`],
          ['evid', `🔬 Evidências (${base.evidencias_cientificas.length})`],
          ['reg', `⚖️ Regulamentação (${base.regulamentacao_brasil.length})`],
          ['gloss', `📖 Glossário (${Object.keys(base.glossario || {}).length})`]
        ].map(([id, label]) => (
          <motion.button
            key={id}
            className={aba === id ? 'ativa' : ''}
            onClick={() => handleAbaChange(id)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            role="tab"
            aria-selected={aba === id}
            aria-controls={`section-${id}`}
            id={`tab-${id}`}
          >
            {label}
          </motion.button>
        ))}
      </motion.nav>

      <main role="tabpanel">
        <AnimatePresence mode="wait">
          {aba === 'meds' && (
            <motion.section 
              key="meds" 
              id="section-meds"
              className="ativa" 
              {...abaAnim}
              role="tabpanel"
              aria-labelledby="tab-meds"
            >
              <div className="grid" role="list">
                {meds.map((m, i) => (
                  <MedicamentoCard key={m.id || m.nome} m={m} index={i} />
                ))}
                {!meds.length && <div className="vazio">Nenhum medicamento encontrado.</div>}
              </div>
            </motion.section>
          )}

          {aba === 'evid' && (
            <motion.section 
              key="evid" 
              id="section-evid"
              className="ativa" 
              {...abaAnim}
              role="tabpanel"
              aria-labelledby="tab-evid"
            >
              {evids.map((e, i) => (
                <EvidenciaItem key={e.estudo} e={e} index={i} />
              ))}
              {!evids.length && <div className="vazio">Nenhuma evidência encontrada.</div>}
            </motion.section>
          )}

          {aba === 'reg' && (
            <motion.section 
              key="reg" 
              id="section-reg"
              className="ativa" 
              {...abaAnim}
              role="tabpanel"
              aria-labelledby="tab-reg"
            >
              {regs.map((r, i) => (
                <RegulamentacaoItem key={r.aspecto} r={r} index={i} />
              ))}
              {!regs.length && <div className="vazio">Nada encontrado na regulamentação.</div>}
            </motion.section>
          )}

          {aba === 'gloss' && (
            <motion.section 
              key="gloss" 
              id="section-gloss"
              className="ativa" 
              {...abaAnim}
              role="tabpanel"
              aria-labelledby="tab-gloss"
            >
              <dl className="gloss">
                {gloss.map(([t, d], i) => (
                  <GlossarioEntry key={t} termo={t} definicao={d} index={i} />
                ))}
              </dl>
              {!gloss.length && <div className="vazio">Termo não encontrado.</div>}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div>Base educacional v{base.metadata?.versao || '?'} — atualizada em {base.metadata?.data_atualizacao || '?'} · {base.medicamentos.length} medicamentos · {base.evidencias_cientificas.length} evidências</div>
        <div style={{ marginTop: 6 }}>HomeoVet — React + Node + Electron + MCP. A eficácia da homeopatia não é sustentada por evidências científicas robustas (Bergh et al., 2021).</div>
      </motion.footer>
    </div>
  );
}
