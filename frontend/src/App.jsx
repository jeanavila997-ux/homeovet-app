import React, { useEffect, useState } from 'react';

// HomeoVet — React frontend
// Carrega a base educacional (JSON) e renderiza com busca, categorias e abas.
// Fallback: se a API não responder, usa o JSON embutido (modo offline/GitHub Pages).

const FALLBACK = window.__HOMEOVET_BASE__ || null;

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
        // Tenta o JSON estático (dist/base.json gerado no build)
        fetch('./base.json')
          .then(r => { if (!r.ok) throw new Error('sem base.json'); return r.json(); })
          .then(d => setBase(d))
          .catch(e => setErro('Base não carregada: ' + e.message));
      });
  }, [base]);

  if (erro) return <div className="vazio">{erro}</div>;
  if (!base) return <div className="vazio">Carregando base educacional…</div>;

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
      <header>
        <h1>🐾 Homeo<span>Vet</span></h1>
        <p>Base educacional de homeopatia veterinária — busca, evidências e regulamentação</p>
        <span className="badge-edu">⚠️ USO ESTRITAMENTE EDUCACIONAL — NÃO diagnostica, NÃO prescreve, NÃO substitui o médico-veterinário</span>
      </header>

      <div className="toolbar">
        <input type="search" placeholder="🔎 Buscar: remédio, sintoma, termo, estudo..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select value={categoria} onChange={e => setCategoria(e.target.value)}>
          <option value="">Todas as categorias ({cats.length})</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <nav>
        <button className={aba === 'meds' ? 'ativa' : ''} onClick={() => setAba('meds')}>💊 Medicamentos ({base.medicamentos.length})</button>
        <button className={aba === 'evid' ? 'ativa' : ''} onClick={() => setAba('evid')}>🔬 Evidências ({base.evidencias_cientificas.length})</button>
        <button className={aba === 'reg' ? 'ativa' : ''} onClick={() => setAba('reg')}>⚖️ Regulamentação ({base.regulamentacao_brasil.length})</button>
        <button className={aba === 'gloss' ? 'ativa' : ''} onClick={() => setAba('gloss')}>📖 Glossário ({Object.keys(base.glossario || {}).length})</button>
      </nav>

      <main>
        {aba === 'meds' && (
          <section className="ativa">
            <div className="grid">
              {meds.map(m => (
                <div className="card" key={m.id || m.nome}>
                  <h3>{m.nome}</h3>
                  <div className="pop">{m.nome_popular || ''}</div>
                  <span className="cat">{m.categoria}</span>
                  <p>{(m.indicacoes_fabricante || '').slice(0, 140)}…</p>
                  <span className="tag-evid">🔬 {(m.evidencia_cientifica || '').slice(0, 60)}…</span>
                </div>
              ))}
              {!meds.length && <div className="vazio">Nenhum medicamento encontrado.</div>}
            </div>
          </section>
        )}

        {aba === 'evid' && (
          <section className="ativa">
            {evids.map(e => (
              <div className="item" key={e.estudo}>
                <h3>{e.estudo}</h3>
                <div className="meta">{e.nivel_evidencia}</div>
                <p>{e.conclusao}</p>
                <p><small>Relevância: {e.relevancia}</small></p>
              </div>
            ))}
            {!evids.length && <div className="vazio">Nenhuma evidência encontrada.</div>}
          </section>
        )}

        {aba === 'reg' && (
          <section className="ativa">
            {regs.map(r => (
              <div className="item" key={r.aspecto}>
                <h3>{r.aspecto}</h3>
                <div className="meta">{r.fonte} · Status: {r.status}</div>
                <p>{r.descricao}</p>
              </div>
            ))}
            {!regs.length && <div className="vazio">Nada encontrado na regulamentação.</div>}
          </section>
        )}

        {aba === 'gloss' && (
          <section className="ativa">
            <dl className="gloss">
              {gloss.map(([t, d]) => <React.Fragment key={t}><dt>{t}</dt><dd>{d}</dd></React.Fragment>)}
            </dl>
            {!gloss.length && <div className="vazio">Termo não encontrado.</div>}
          </section>
        )}
      </main>

      <footer>
        <div>Base educacional v{base.metadata?.versao || '?'} — atualizada em {base.metadata?.data_atualizacao || '?'} · {base.medicamentos.length} medicamentos · {base.evidencias_cientificas.length} evidências</div>
        <div style={{ marginTop: 6 }}>HomeoVet — React + Node + Electron + MCP. A eficácia da homeopatia não é sustentada por evidências científicas robustas (Bergh et al., 2021).</div>
      </footer>
    </div>
  );
}
