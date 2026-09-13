import React, { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// HomeoVet — React frontend com animações (Framer Motion)
// Carrega a base educacional (JSON) e renderiza: busca, categorias, abas,
// modal de ficha, conceitos fundamentais, perguntas de revisão e Tutor IA (RAG local).
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
  const value = String(s);
  if (normCache.has(value)) return normCache.get(value);
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  normCache.set(value, normalized);
  return normalized;
};

// ---------- Regras e prompt do Tutor IA (espelhado do legado + tutor_homeopatia_vet.py) ----------
const PALAVRAS_BLOQUEIO = [
  'meu cão tem', 'meu gato tem', 'meu animal tem', 'está doente',
  'diagnostique', 'diagnóstico', 'qual remédio devo dar', 'qual dose',
  'quanto devo dar', 'posso dar', 'devo usar', 'tratamento para',
  'cura para', 'melhor remédio para', 'indique um remédio',
  'receita para', 'prescreva', 'prescrição', 'dosagem para',
  'combine', 'misture', 'substitua', 'em vez de', 'troque'
];
const SINTOMAS_URGENTES = [
  'dificuldade para respirar', 'respiração ofegante', 'cianose',
  'desmaio', 'convulsão', 'sangramento', 'hemorragia',
  'vômito persistente', 'diarreia com sangue', 'não urina',
  'abdome distendido', 'traumatismo', 'fratura', 'envenenamento',
  'intoxicação', 'paralisia', 'não se move', 'inconsciente',
  'convuls', 'vomitando sangue', 'vômito com sangue',
  'vomitando muito', 'não consegue respirar', 'não consegue andar',
  'não consegue levantar', 'envenenado', 'intoxicado'
];
const MODELOS = ['homeovet-tutor', 'nemotron-3-nano:4b'];
const OLLAMA_URL = 'http://localhost:11434/api/chat';

const SYSTEM_RAG =
`Você é o Tutor HomeoVet, um agente EDUCACIONAL de homeopatia veterinária.

REGRAS INVIOLÁVEIS:
1. NUNCA diagnostique, prescreva, recomende doses ou tratamentos para casos individuais.
2. Responda EXCLUSIVAMENTE com o CONTEXTO fornecido abaixo (base educacional do projeto).
3. Se a informação não estiver no contexto, diga: "Informação não disponível na base educacional."
4. NÃO invente fontes, estudos ou números.
5. Lembre sempre que a eficácia da homeopatia não é sustentada por evidências científicas robustas (Bergh et al., 2021).
6. Se houver indício de emergência ou caso clínico real, oriente procurar um MÉDICO-VETERINÁRIO com urgência.

FORMATO OBRIGATÓRIO DA RESPOSTA (em português do Brasil):
📌 RESPOSTA OBJETIVA — 2 a 4 linhas diretas.
📚 EXPLICAÇÃO DIDÁTICA — desenvolvimento com o contexto disponível.
📖 FONTE — diga se é declaração de fabricante, evidência científica ou conhecimento teórico.
🔬 EVIDÊNCIAS E LIMITAÇÕES — o que a ciência diz (ou a falta de evidência).
⚠️ AVISO — lembrete educacional final (sem diagnóstico/prescrição; consulte veterinário).`;

const MSG_EMERGENCIA = (sintoma) =>
`🚨 ATENÇÃO — POSSÍVEL EMERGÊNCIA
Detectei menção a: "${sintoma}"
Procure um MÉDICO-VETERINÁRIO URGENTEMENTE ou uma clínica 24h.
A homeopatia NÃO substitui atendimento de emergência.`;

const MSG_BLOQUEIO =
`⚠️ AVISO DE SEGURANÇA
Sou um tutor EDUCACIONAL sobre homeopatia veterinária.
NÃO posso: diagnosticar, prescrever, recomendar doses ou substituir o veterinário.
Posso ajudar com: conceitos teóricos, terminologia, legislação e evidências científicas.
👉 Consulte um MÉDICO-VETERINÁRIO para qualquer caso individual.`;

// ---------- Componentes memoizados ----------
const MedicamentoCard = memo(({ m, index, onSelect }) => (
  <motion.div
    className="card"
    custom={index}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    whileHover={{ scale: 1.03, borderColor: 'var(--accent)' }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onSelect && onSelect(m)}
  >
    <h3>{m.nome}</h3>
    <div className="pop">{m.nome_popular || ''}</div>
    <span className="cat">{m.categoria}</span>
    <p>{(m.indicacoes_fabricante || '').slice(0, 140)}…</p>
    <span className="tag-evid">🔬 {(m.evidencia_cientifica || '').slice(0, 60)}…</span>
  </motion.div>
));
MedicamentoCard.displayName = 'MedicamentoCard';

const EvidenciaItem = memo(({ e, index }) => (
  <motion.div
    className="item"
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

const RegulamentacaoItem = memo(({ r, index }) => (
  <motion.div
    className="item"
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

const GlossarioEntry = memo(({ termo, definicao, index }) => (
  <motion.div key={termo} custom={index} variants={fadeUp} initial="hidden" animate="visible">
    <dt>{termo}</dt>
    <dd>{definicao}</dd>
  </motion.div>
));
GlossarioEntry.displayName = 'GlossarioEntry';

const ConceitoItem = memo(({ c, index }) => (
  <motion.div className="item conceito" custom={index} variants={fadeUp} initial="hidden" animate="visible">
    <h3>{c.termo}</h3>
    <div className="meta">{c.tipo_informacao} {c.fonte ? `· Fonte: ${c.fonte}` : ''}</div>
    <p>{c.definicao}</p>
    <p><small>🔬 Evidência: {c.evidencia_cientifica}</small></p>
    {c.notas && <p className="nota"><small>📝 {c.notas}</small></p>}
  </motion.div>
));
ConceitoItem.displayName = 'ConceitoItem';

const RevisaoCard = memo(({ pergunta, index, dica, onMostrarDica }) => (
  <motion.div className="item revisao" custom={index} variants={fadeUp} initial="hidden" animate="visible">
    <h3>📝 Pergunta {index + 1}</h3>
    <p>{pergunta}</p>
    {!dica ? (
      <button className="btn-dica" onClick={() => onMostrarDica(index)}>🔎 Ver pista de estudo</button>
    ) : (
      <div className="dica">
        <div className="meta">Conteúdo relacionado da base educacional:</div>
        {dica.map((d, i) => <p key={i} className="dica-item">• {d}</p>)}
      </div>
    )}
  </motion.div>
));
RevisaoCard.displayName = 'RevisaoCard';

const FichaModal = memo(({ med, onFechar }) => {
  if (!med) return null;
  const campos = [
    ['Origem', med.origem],
    ['Composição declarada', med.principio_ativo_declarado],
    ['Potências comuns', (med.potencias_comuns || []).join(', ')],
    ['Apresentações', med.apresentacoes],
    ['Conservação', med.conservacao],
    ['Indicações (fabricante)', med.indicacoes_fabricante],
    ['Registro MAPA', med.indicacoes_registro_mapa],
    ['Sintomas homeopáticos', (med.sintomas_homeopaticos || []).join('; ')],
    ['Contraindicações', med.contraindicacoes],
    ['Precauções', med.precaucoes],
    ['Uso veterinário', med.uso_veterinario],
    ['Tipo de informação', med.tipo_informacao],
    ['Evidência científica', med.evidencia_cientifica],
    ['Notas', med.notas]
  ].filter(([, v]) => v);
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        className="modal"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <button className="fechar" onClick={onFechar}>✕ Fechar</button>
        <h2>{med.nome}</h2>
        <div className="pop">
          {med.nome_popular ? `“${med.nome_popular}” · ${med.categoria}` : med.categoria}
        </div>
        <dl>
          {campos.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}
        </dl>
        <div className="rodape-modal">⚠️ Ficha EDUCACIONAL. Declarações de fabricante ≠ evidência científica. Consulte um médico-veterinário para qualquer decisão clínica.</div>
      </motion.div>
    </motion.div>
  );
});
FichaModal.displayName = 'FichaModal';

// ---------- Componente principal ----------
export default function App() {
  const [base, setBase] = useState(FALLBACK);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [aba, setAba] = useState('meds');
  const [erro, setErro] = useState('');

  // Modal de ficha
  const [medModal, setMedModal] = useState(null);

  // Chat / Tutor IA
  const [iaAtivo, setIaAtivo] = useState(false);
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [respostaClasse, setRespostaClasse] = useState('');
  const [carregando, setCarregando] = useState(false);
  const abaCtrlRef = useRef(null);

  // Dicas de revisão: índice -> docs relacionados
  const [dicas, setDicas] = useState({});

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

  // Aborta o fetch do chat ao desmontar
  useEffect(() => () => { if (abaCtrlRef.current) abaCtrlRef.current.abort(); }, []);

  // Fecha modal com Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMedModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleBuscaChange = useCallback((e) => setBusca(e.target.value), []);
  const handleCategoriaChange = useCallback((e) => setCategoria(e.target.value), []);
  const handleAbaChange = useCallback((id) => setAba(id), []);

  // ------------------------------------------------------------------
  // DADOS DERIVADOS (hooks SEMPRE chamados em toda render — guardados
  // para base ainda nula, evitando violação das Regras de Hooks que
  // causava a "tela preta" quando a base carregava após o 1º render).
  // ------------------------------------------------------------------

  // Documentos RAG (lista memoizada a partir da base carregada)
  const documentos = useMemo(() => {
    if (!base) return [];
    const docs = [];
    base.medicamentos.forEach(m => docs.push(
      `MEDICAMENTO ${m.nome} (${m.nome_popular}) — categoria ${m.categoria}. ` +
      `Origem: ${m.origem}. Composição declarada: ${m.principio_ativo_declarado}. ` +
      `Indicações do fabricante: ${m.indicacoes_fabricante}. ` +
      `Sintomas homeopáticos: ${(m.sintomas_homeopaticos || []).join('; ')}. ` +
      `Contraindicações: ${m.contraindicacoes}. Uso veterinário: ${m.uso_veterinario}. ` +
      `Tipo de informação: ${m.tipo_informacao}. Evidência científica: ${m.evidencia_cientifica}.`));
    (base.conceitos_fundamentais || []).forEach(c => docs.push(
      `CONCEITO ${c.termo}: ${c.definicao} Tipo: ${c.tipo_informacao}. ` +
      `Evidência: ${c.evidencia_cientifica}. Notas: ${c.notas}.`));
    base.evidencias_cientificas.forEach(e => docs.push(
      `EVIDÊNCIA CIENTÍFICA — ${e.estudo}: ${e.conclusao} Nível: ${e.nivel_evidencia}.`));
    base.regulamentacao_brasil.forEach(r => docs.push(
      `REGULAMENTAÇÃO — ${r.aspecto}: ${r.descricao} Status: ${r.status}.`));
    Object.entries(base.glossario || {}).forEach(([t, d]) => docs.push(`GLOSSÁRIO — ${t}: ${d}`));
    return docs;
  }, [base]);

  // RAG offline no navegador: ranqueia documentos pela pergunta
  const contextoPara = useCallback((pergunta, n = 6) => {
    const termos = norm(pergunta).split(/\s+/).filter(t => t.length > 2);
    const pontuado = documentos.map(doc => {
      const alvo = norm(doc);
      let pts = 0;
      termos.forEach(t => { if (alvo.includes(t)) pts += 1; });
      return [pts, doc];
    });
    pontuado.sort((a, b) => b[0] - a[0]);
    return pontuado.slice(0, n).map(p => p[1]);
  }, [documentos]);

  // Dados derivados memoizados
  const q = useMemo(() => norm(busca.trim()), [busca]);

  const cats = useMemo(() =>
    base ? [...new Set(base.medicamentos.map(m => m.categoria))].sort() : [],
    [base]);

  const meds = useMemo(() => {
    if (!base) return [];
    return base.medicamentos.filter(m => {
      const okCat = !categoria || m.categoria === categoria;
      if (!okCat) return false;
      if (!q) return true;
      const alvo = norm([
        m.nome,
        m.nome_popular,
        m.categoria,
        m.origem,
        m.principio_ativo_declarado,
        (m.sintomas_homeopaticos || []).join(' '),
        m.indicacoes_fabricante,
        m.uso_veterinario,
        m.contraindicacoes,
        m.precaucoes
      ].join(' '));
      return alvo.includes(q);
    });
  }, [base, categoria, q]);

  const evids = useMemo(() => {
    if (!base) return [];
    if (!q) return base.evidencias_cientificas;
    return base.evidencias_cientificas.filter(e => {
      const alvo = norm([e.estudo, e.conclusao, e.nivel_evidencia, e.relevancia].join(' '));
      return alvo.includes(q);
    });
  }, [base, q]);

  const regs = useMemo(() => {
    if (!base) return [];
    if (!q) return base.regulamentacao_brasil;
    return base.regulamentacao_brasil.filter(r => {
      const alvo = norm([r.aspecto, r.descricao, r.fonte, r.status].join(' '));
      return alvo.includes(q);
    });
  }, [base, q]);

  const gloss = useMemo(() => {
    if (!base) return [];
    const entries = Object.entries(base.glossario || {});
    if (!q) return entries;
    return entries.filter(([t, d]) => {
      const alvo = norm(t + ' ' + d);
      return alvo.includes(q);
    });
  }, [base, q]);

  const conceitos = useMemo(() => {
    if (!base) return [];
    if (!q) return base.conceitos_fundamentais || [];
    return (base.conceitos_fundamentais || []).filter(c => {
      const alvo = norm([c.termo, c.definicao, c.tipo_informacao].join(' '));
      return alvo.includes(q);
    });
  }, [base, q]);

  // Perguntas de revisão (sempre todas; a busca não filtra para não esconder o material de estudo)
  const perguntasRevisao = base ? (base.perguntas_revisao || []) : [];

  // ---------- Manipulação do Tutor IA ----------
  const perguntar = useCallback(async () => {
    const p = pergunta.trim();
    if (!p) { setResposta('Digite uma pergunta educacional acima.'); setRespostaClasse('erro'); return; }

    // 1) Emergência — sempre antes de tudo
    const urg = SINTOMAS_URGENTES.find(s => norm(p).includes(norm(s)));
    if (urg) { setResposta(MSG_EMERGENCIA(urg)); setRespostaClasse('aviso'); return; }

    // 2) Tentativa de diagnóstico/prescrição — bloqueio por regras (nunca LLM)
    const bloq = PALAVRAS_BLOQUEIO.find(w => norm(p).includes(norm(w)));
    if (bloq) { setResposta(MSG_BLOQUEIO); setRespostaClasse('aviso'); return; }

    // 3) Modo IA local
    if (!iaAtivo) {
      setResposta('Ative o checkbox "modo IA local" para conversar com o tutor via Ollama.');
      setRespostaClasse('erro');
      return;
    }

    const contexto = contextoPara(p);
    const user = `PERGUNTA: ${p}\n\nCONTEXTO DA BASE EDUCACIONAL HomeoVet (use SOMENTE isto):\n` +
      contexto.join('\n---\n');

    if (abaCtrlRef.current) abaCtrlRef.current.abort();
    const controller = new AbortController();
    abaCtrlRef.current = controller;
    const limite = setTimeout(() => controller.abort(), 120000);
    const timeout = 120000;

    setCarregando(true);
    setResposta('🧠 Consultando o Ollama local…');
    setRespostaClasse('ok');

    let respostaFinal = null, erroFinal = null;
    for (const modelo of MODELOS) {
      try {
        const r = await fetch(OLLAMA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'system', content: SYSTEM_RAG },
              { role: 'user', content: user }
            ],
            stream: false,
            options: { temperature: 0.2, num_ctx: 4096 }
          })
        });
        if (!r.ok) { erroFinal = `HTTP ${r.status}`; continue; }
        const dados = await r.json();
        respostaFinal = ((dados.message || {}).content || '').trim();
        if (respostaFinal) break;
      } catch (e) {
        erroFinal = controller.signal.aborted
          ? `tempo esgotado (${timeout / 1000}s)`
          : e.message;
      }
    }
    clearTimeout(limite);
    setCarregando(false);

    if (respostaFinal) {
      setResposta(`🎓 Tutor HomeoVet (IA local)\n\n${respostaFinal}\n\n⚠️ Resposta EDUCACIONAL, ancorada na base do projeto. Confirme sempre com um médico-veterinário.`);
      setRespostaClasse('ok');
      return;
    }

    setResposta(
`❌ Não consegui falar com o Ollama local (${erroFinal || 'indisponível'}).

Checklist:
1. Ollama instalado e rodando: ollama serve
2. Modelo do tutor criado: ollama create homeovet-tutor -f Modelfile.homeovet
   (sem ele, o fallback nemotron-3-nano:4b é usado — ollama pull nemotron-3-nano:4b)
3. Se o navegador bloquear (CORS), inicie o Ollama permitindo a origem:
   OLLAMA_ORIGINS=* ollama serve

Enquanto isso, a interface continua 100% funcional offline (abas, busca, fichas).`);
    setRespostaClasse('erro');
  }, [pergunta, iaAtivo, contextoPara]);

  // Pista de estudo para perguntas de revisão
  const mostrarDica = useCallback((idx) => {
    setDicas(prev => {
      if (prev[idx]) return prev;
      const doc = contextoPara(perguntasRevisao[idx] || '', 4);
      return { ...prev, [idx]: doc };
    });
  }, [contextoPara, perguntasRevisao]);

  // A partir daqui todos os hooks já foram chamados — returns condicionais ok.
  if (erro) return <div className="vazio">{erro}</div>;
  if (!base) return (
    <motion.div className="vazio" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      Carregando base educacional…
    </motion.div>
  );

  const legendas = (base.metadata || {}).avisos_legais || {};

  return (
    <div className="wrap">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>🐾 Homeo<span>Vet</span></h1>
        <p>Base educacional de homeopatia veterinária — busca, evidências, conceitos e Tutor IA</p>
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
          placeholder="🔎 Buscar: remédio, sintoma, conceito, termo, estudo..."
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
          ['conc', `🧠 Conceitos (${conceitos.length})`],
          ['gloss', `📖 Glossário (${Object.keys(base.glossario || {}).length})`],
          ['revis', `📚 Revisão (${perguntasRevisao.length})`],
          ['tutor', '🤖 Tutor IA']
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
                  <MedicamentoCard key={m.id || m.nome} m={m} index={i} onSelect={setMedModal} />
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

          {aba === 'conc' && (
            <motion.section
              key="conc"
              id="section-conc"
              className="ativa"
              {...abaAnim}
              role="tabpanel"
              aria-labelledby="tab-conc"
            >
              <p className="secao-intro">Princípios teóricos fundamentais da homeopatia. Clique em um medicamento na aba 💊 para ver a ficha completa.</p>
              {conceitos.map((c, i) => (
                <ConceitoItem key={c.termo} c={c} index={i} />
              ))}
              {!conceitos.length && <div className="vazio">Conceito não encontrado.</div>}
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

          {aba === 'revis' && (
            <motion.section
              key="revis"
              id="section-revis"
              className="ativa"
              {...abaAnim}
              role="tabpanel"
              aria-labelledby="tab-revis"
            >
              <p className="secao-intro">20 perguntas de estudo. Use "ver pista de estudo" para conferir o conteúdo relacionado da base.</p>
              {perguntasRevisao.map((per, i) => (
                <RevisaoCard
                  key={i}
                  index={i}
                  pergunta={per}
                  dica={dicas[i]}
                  onMostrarDica={mostrarDica}
                />
              ))}
            </motion.section>
          )}

          {aba === 'tutor' && (
            <motion.section
              key="tutor"
              id="section-tutor"
              className="ativa tutor"
              {...abaAnim}
              role="tabpanel"
              aria-labelledby="tab-tutor"
            >
              <details className="tutor" open>
                <summary>🤖 Pergunte ao Tutor (IA local via Ollama — opcional)</summary>
                <div className="ia-linha">
                  <input
                    type="checkbox"
                    id="ia-toggle"
                    checked={iaAtivo}
                    onChange={(e) => setIaAtivo(e.target.checked)}
                  />
                  <label htmlFor="ia-toggle">Ativar modo IA local (requer Ollama rodando em <code>localhost:11434</code>)</label>
                </div>
                <textarea
                  id="pergunta"
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  placeholder="Ex.: O que é a Lei do Semelhante? / O que diz a regulamentação do MAPA? (perguntas EDUCACIONAIS — diagnóstico e dose são bloqueados)"
                />
                <div className="ia-linha">
                  <button id="btn-perguntar" onClick={perguntar} disabled={carregando}>
                    {carregando ? 'Consultando…' : 'Perguntar'}
                  </button>
                  <small style={{ color: 'var(--muted)' }}>Respostas ancoradas apenas na base (RAG). Sem Ollama, a interface segue funcional.</small>
                </div>
                <div className={`resposta ${respostaClasse}`}>
                  {resposta}
                </div>
              </details>

              <div className="aviso-legal">
                <strong>Avisos legais:</strong>
                <ul>
                  {Object.entries(legendas).map(([k, v]) => <li key={k}>{v}</li>)}
                </ul>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {medModal && (
          <FichaModal med={medModal} onFechar={() => setMedModal(null)} />
        )}
      </AnimatePresence>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div>Base educacional v{base.metadata?.versao || '?'} — atualizada em {base.metadata?.data_atualizacao || '?'} · {base.medicamentos.length} medicamentos · {base.evidencias_cientificas.length} evidências · {Object.keys(base.glossario || {}).length} termos</div>
        <div style={{ marginTop: 6 }}>HomeoVet — React + Node + Electron + MCP. A eficácia da homeopatia não é sustentada por evidências científicas robustas (Bergh et al., 2021).</div>
      </motion.footer>
    </div>
  );
}
