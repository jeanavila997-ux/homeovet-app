import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// HomeoVet — React frontend com animações (Framer Motion)
// Carrega a base educacional (JSON) e renderiza com busca, categorias e abas.
// Fallback: se a API não responder, usa o JSON embutido (modo offline/GitHub Pages).

const FALLBACK = window.__HOMEOVET_BASE__ || null;

// Variantes de animação
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' }
  })
};

const abaAnim = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.15 } }
};

export default function App() {
  const [base, setBase] = useState(FALLBACK);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [aba, setAba] = useState('meds');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (base) return;
    fetch('/api/base')
      .then(r => { if (!r.ok) throw new Error('API indisponível'); return r.json(); })
      .then(d => setBase(d))
      .catch(() => {
        fetch('./base.json')
          .then(r => { if (!r.ok) throw new Error('sem base.json'); return r.json(); })
          .then(d => setBase(d))
          .catch(e => setErro('Base não carregada: ' + e.message));
      });
  }, [base]);

  if (erro) return <div className="vazio">{erro}</div>;
  if (!base) return (
    <motion.div className="vazio" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      Carregando base educacional…
    </motion.div>
  );

  const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = norm(busca.trim());
  const cats = [...new Set(base.medicamentos.map(m => m.categoria))].sort();

  const meds = base.medicamentos.filter(m => {
    const okCat = !categoria || m.categoria === categoria;
    const alvo = norm([m.nome, m.nome_popular, m.categoria, (m.sintomas_homeopaticos || []).join(' '), m.indicacoes_fabricante].join(' '));
    return okCat && (!q || alvo.includes(q));
  });

  const evids = base.evidencias_cientificas.filter(e => {
    const alvo = norm([e.estudo, e.conclusao, e.nivel_evidencia].join(' '));
    return !q || alvo.includes(q);
  });

  const regs = base.regulamentacao_brasil.filter(r => {
    const alvo = norm([r.aspecto, r.descricao, r.fonte].join(' '));
    return !q || alvo.includes(q);
  });

  const gloss = Object.entries(base.glossario || {}).filter(([t, d]) => {
    const alvo = norm(t + ' ' + d);
    return !q || alvo.includes(q);
  });

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
        <input type="search" placeholder="🔎 Buscar: remédio, sintoma, termo, estudo..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select value={categoria} onChange={e => setCategoria(e.target.value)}>
          <option value="">Todas as categorias ({cats.length})</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </motion.div>

      <motion.nav
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
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
            onClick={() => setAba(id)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            {label}
          </motion.button>
        ))}
      </motion.nav>

      <main>
        <AnimatePresence mode="wait">
          {aba === 'meds' && (
            <motion.section key="meds" className="ativa" {...abaAnim}>
              <div className="grid">
                {meds.map((m, i) => (
                  <motion.div
                    className="card"
                    key={m.id || m.nome}
                    custom={i}
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
                ))}
                {!meds.length && <div className="vazio">Nenhum medicamento encontrado.</div>}
              </div>
            </motion.section>
          )}

          {aba === 'evid' && (
            <motion.section key="evid" className="ativa" {...abaAnim}>
              {evids.map((e, i) => (
                <motion.div
                  className="item"
                  key={e.estudo}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <h3>{e.estudo}</h3>
                  <div className="meta">{e.nivel_evidencia}</div>
                  <p>{e.conclusao}</p>
                  <p><small>Relevância: {e.relevancia}</small></p>
                </motion.div>
              ))}
              {!evids.length && <div className="vazio">Nenhuma evidência encontrada.</div>}
            </motion.section>
          )}

          {aba === 'reg' && (
            <motion.section key="reg" className="ativa" {...abaAnim}>
              {regs.map((r, i) => (
                <motion.div
                  className="item"
                  key={r.aspecto}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <h3>{r.aspecto}</h3>
                  <div className="meta">{r.fonte} · Status: {r.status}</div>
                  <p>{r.descricao}</p>
                </motion.div>
              ))}
              {!regs.length && <div className="vazio">Nada encontrado na regulamentação.</div>}
            </motion.section>
          )}

          {aba === 'gloss' && (
            <motion.section key="gloss" className="ativa" {...abaAnim}>
              <dl className="gloss">
                {gloss.map(([t, d], i) => (
                  <motion.div key={t} custom={i} variants={fadeUp} initial="hidden" animate="visible">
                    <dt>{t}</dt>
                    <dd>{d}</dd>
                  </motion.div>
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
