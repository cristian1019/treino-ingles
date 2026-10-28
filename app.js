'use strict';
/* =====================================================================
   Treino de Inglês — digitação + vocabulário + audição
   ===================================================================== */

// ---------- dados ----------
const TEMAS = {
  gramatica: ['Gramática', '🔤'], comunicacao: ['Comunicação', '💬'], pessoas: ['Pessoas', '👪'],
  casa: ['Casa', '🏠'], comida: ['Comida', '🍎'], corpo: ['Corpo', '🖐️'], tempo: ['Tempo', '⏰'],
  lugares: ['Lugares', '🗺️'], trabalho: ['Trabalho', '💼'], acoes: ['Ações', '🏃'],
  descricao: ['Descrição', '✨'], numeros: ['Números', '🔢'], cores: ['Cores', '🎨'],
  animais: ['Animais', '🐾'], viagem: ['Viagem', '✈️'], natureza: ['Natureza', '🌳'],
  sentimentos: ['Sentimentos', '😊'], escola: ['Escola', '📚'], tecnologia: ['Tecnologia', '💻'],
  roupas: ['Roupas', '👕'], saude: ['Saúde', '🩺'], dinheiro: ['Dinheiro', '💰'],
  esporte: ['Esporte', '⚽'], lazer: ['Lazer', '🎉'],
};
const NOMES_NIVEL = ['Iniciante', 'Básico', 'Intermediário', 'Avançado'];
const POR_FASE = 10;

const PALAVRAS = [];
(window.NIVEIS || []).forEach((txt, nivel) => {
  txt.trim().split('\n').forEach((linha, idx) => {
    const [w, pt, em, tema, fr, frpt] = linha.split('|');
    PALAVRAS.push({
      id: w.toLowerCase(), w, alvo: w.replace(/\s*\(.*?\)\s*/g, '').trim(),
      pt, em, tema, fr, frpt, nivel, idx,
    });
  });
});
const FASES_POR_NIVEL = (window.NIVEIS || []).map(t => Math.ceil(t.trim().split('\n').length / POR_FASE));
const VIDEOS = window.VIDEOS || [];

// ---------- armazenamento ----------
const CHAVE = 'treinoIngles.v1';
const estadoPadrao = () => ({
  fases: {}, palavras: {}, frases: [], dias: {},
  config: { voz: '', vel: 0.9, ignorarMaiusc: false, autoFalar: true, tema: '' },
});
let E = carregar();
function carregar() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE));
    if (s) { const p = estadoPadrao(); return { ...p, ...s, config: { ...p.config, ...s.config } }; }
  } catch (e) { /* sem armazenamento */ }
  return estadoPadrao();
}
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { /* ignora */ } }
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function dia() { return (E.dias[hoje()] ||= { seg: 0, chars: 0, erros: 0, fases: 0, linhas: 0 }); }
function stPalavra(id) { return (E.palavras[id] ||= { vistas: 0, erros: 0, limpas: 0, dicas: 0 }); }

// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const emojiDe = p => p.em || (TEMAS[p.tema] || ['', '📝'])[1];
const estrelasHtml = n => [1, 2, 3].map(i => `<span class="${i <= n ? '' : 'vazia'}">★</span>`).join('');
const embaralhar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtSeg = s => { s = Math.round(s); return `${String(Math.floor(s / 60)).padStart(1, '0')}:${String(s % 60).padStart(2, '0')}`; };
const palavrasDaFase = (n, f) => PALAVRAS.filter(p => p.nivel === n && Math.floor(p.idx / POR_FASE) === f);
const chaveFase = (n, f) => `${n}-${f}`;
const faseLiberada = (n, f) => f === 0 || !!E.fases[chaveFase(n, f - 1)];

// ---------- voz ----------
let vozes = [];
function carregarVozes() {
  vozes = (speechSynthesis.getVoices() || []).filter(v => /^en[-_]/i.test(v.lang));
  const sel = $('#cfgVoz');
  if (!sel) return;
  sel.innerHTML = vozes.map(v => `<option value="${esc(v.voiceURI)}">${esc(v.name)} (${v.lang})</option>`).join('') || '<option>Nenhuma voz em inglês encontrada</option>';
  sel.value = vozEscolhida()?.voiceURI || '';
}
function vozEscolhida() {
  if (!vozes.length) return null;
  const pref = vozes.find(v => v.voiceURI === E.config.voz);
  if (pref) return pref;
  const ordem = [/Aria|Jenny|Guy|Ava|Andrew|Emma/i, /Google US English/i, /en-US/i, /Zira|David|Mark/i];
  for (const r of ordem) { const v = vozes.find(v => r.test(v.name) || r.test(v.lang)); if (v) return v; }
  return vozes[0];
}
function falar(texto, vel) {
  if (!('speechSynthesis' in window) || !texto) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  const v = vozEscolhida();
  if (v) u.voice = v;
  u.lang = v?.lang || 'en-US';
  u.rate = vel || E.config.vel;
  speechSynthesis.speak(u);
}
if ('speechSynthesis' in window) { carregarVozes(); speechSynthesis.onvoiceschanged = carregarVozes; }

// ---------- navegação ----------
let telaAtual = 'inicio';
const RENDER = {};
function ir(tela) {
  if (telaAtual === 'jogo' && tela !== 'jogo') pararJogo();
  if (telaAtual === 'conversa' && tela !== 'conversa') window.pararConversa?.();
  telaAtual = tela;
  $$('.tela').forEach(t => t.classList.toggle('ativa', t.id === 'tela-' + tela));
  const menu = { jogo: 'vocab', fim: 'vocab' }[tela] || tela;
  $$('.menu a').forEach(a => a.classList.toggle('ativo', a.dataset.ir === menu));
  if (['inicio', 'vocab', 'revisao', 'dicionario', 'conversa', 'stats'].includes(tela) && location.hash !== '#' + tela) history.replaceState(null, '', '#' + tela);
  RENDER[tela]?.();
  window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-ir]');
  if (a) { e.preventDefault(); ir(a.dataset.ir); }
});

// ---------- tema ----------
function aplicarTema() {
  if (E.config.tema) document.documentElement.dataset.theme = E.config.tema;
  else delete document.documentElement.dataset.theme;
}
$('#btnTema').onclick = () => {
  const escuroAgora = E.config.tema ? E.config.tema === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  E.config.tema = escuroAgora ? 'light' : 'dark';
  aplicarTema(); salvar();
};
aplicarTema();

// ---------- números gerais ----------
function totais() {
  const dominadas = PALAVRAS.filter(p => (E.palavras[p.id]?.limpas || 0) > 0).length;
  const fases = Object.keys(E.fases).length;
  const totalFases = FASES_POR_NIVEL.reduce((a, b) => a + b, 0);
  const dias = Object.entries(E.dias);
  const seg = dias.reduce((a, [, d]) => a + d.seg, 0);
  const chars = dias.reduce((a, [, d]) => a + d.chars, 0);
  const erros = dias.reduce((a, [, d]) => a + d.erros, 0);
  let seq = 0;
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (E.dias[k]?.seg > 0) seq++;
    else if (k !== hoje()) break;
  }
  const ppm = seg > 0 ? Math.round((chars / 5) / (seg / 60)) : 0;
  const prec = chars + erros > 0 ? Math.round(100 * chars / (chars + erros)) : 0;
  return { dominadas, fases, totalFases, seg, ppm, prec, seq };
}
function kpis(t) {
  return `
    <div class="kpi"><b>${t.dominadas}<small style="font-size:.9rem;color:var(--txt3)"> / ${PALAVRAS.length}</small></b><span>palavras dominadas</span></div>
    <div class="kpi"><b>${t.fases}<small style="font-size:.9rem;color:var(--txt3)"> / ${t.totalFases}</small></b><span>fases concluídas</span></div>
    <div class="kpi"><b>${t.ppm || '–'}</b><span>palavras por minuto</span></div>
    <div class="kpi"><b>${t.prec ? t.prec + '%' : '–'}</b><span>precisão média</span></div>
    <div class="kpi"><b>${t.seq} 🔥</b><span>dias seguidos</span></div>
    <div class="kpi"><b>${Math.round(t.seg / 60)}</b><span>minutos praticados</span></div>`;
}
function proximaFase() {
  for (let n = 0; n < FASES_POR_NIVEL.length; n++)
    for (let f = 0; f < FASES_POR_NIVEL[n]; f++)
      if (!E.fases[chaveFase(n, f)]) return { n, f };
  return { n: 0, f: 0 };
}

// ---------- INÍCIO ----------
RENDER.inicio = () => {
  $('#resumoInicio').innerHTML = kpis(totais());
  const { n, f } = proximaFase();
  const ps = palavrasDaFase(n, f);
  $('#descContinuar').textContent = `${NOMES_NIVEL[n]} · Fase ${f + 1}: ${ps.slice(0, 4).map(p => p.alvo).join(', ')}…`;
  $('#btnContinuar').onclick = () => iniciarFase({ tipo: 'fase', n, f });
  const rev = palavrasRevisao().length;
  $('#descRevisao').textContent = rev ? `${rev} palavra${rev > 1 ? 's' : ''} para revisar.` : 'Nada para revisar ainda. Continue jogando!';
};

// ---------- VOCABULÁRIO ----------
let nivelVisto = 0;
RENDER.vocab = () => {
  $('#abasNivel').innerHTML = NOMES_NIVEL.map((nome, n) => {
    const feitas = Object.keys(E.fases).filter(k => k.startsWith(n + '-')).length;
    return `<button class="aba ${n === nivelVisto ? 'ativo' : ''}" data-n="${n}">${nome}<small>${feitas}/${FASES_POR_NIVEL[n]}</small></button>`;
  }).join('');
  $$('#abasNivel .aba').forEach(b => b.onclick = () => { nivelVisto = +b.dataset.n; RENDER.vocab(); });
  const n = nivelVisto;
  $('#nivelInfo').textContent = `${FASES_POR_NIVEL[n]} fases de ${POR_FASE} palavras. Ganhe pelo menos 1 estrela para liberar a próxima fase.`;
  const prox = proximaFase();
  let html = '';
  for (let f = 0; f < FASES_POR_NIVEL[n]; f++) {
    const r = E.fases[chaveFase(n, f)];
    const lib = faseLiberada(n, f);
    const ps = palavrasDaFase(n, f);
    html += `<button class="fase ${prox.n === n && prox.f === f ? 'atual' : ''}" data-f="${f}" ${lib ? '' : 'disabled'}>
      <span class="f-num">${lib ? '' : '🔒 '}Fase ${f + 1}</span>
      <span class="f-palavras">${ps.slice(0, 5).map(p => esc(p.alvo)).join(' · ')}</span>
      <span class="f-estrelas">${estrelasHtml(r?.estrelas || 0)}</span>
    </button>`;
  }
  $('#gradeFases').innerHTML = html;
  $$('#gradeFases .fase').forEach(b => b.onclick = () => iniciarFase({ tipo: 'fase', n, f: +b.dataset.f }));
  const cont = {};
  PALAVRAS.forEach(p => cont[p.tema] = (cont[p.tema] || 0) + 1);
  $('#chipsTemas').innerHTML = Object.entries(TEMAS).filter(([k]) => cont[k])
    .map(([k, [nome, ic]]) => `<button class="chip" data-t="${k}">${ic} ${nome} <small>${cont[k]}</small></button>`).join('');
  $$('#chipsTemas .chip').forEach(b => b.onclick = () => iniciarTema(b.dataset.t));
};
function iniciarTema(tema) {
  const lista = PALAVRAS.filter(p => p.tema === tema);
  // prioriza as que ainda não foram dominadas
  const novas = embaralhar(lista.filter(p => !(E.palavras[p.id]?.limpas > 0)));
  const velhas = embaralhar(lista.filter(p => E.palavras[p.id]?.limpas > 0));
  iniciarFase({ tipo: 'tema', tema, palavras: [...novas, ...velhas].slice(0, POR_FASE) });
}

// ---------- JOGO (digitação) ----------
let J = null; // estado da partida
function iniciarFase(cfg) {
  const palavras = cfg.palavras || palavrasDaFase(cfg.n, cfg.f);
  if (!palavras.length) return;
  J = {
    cfg, palavras, i: 0, etapa: 'palavra', pos: 0, alvo: '',
    errosItem: 0, dicaItem: false, errosPorPalavra: {}, dicasPorPalavra: {},
    chars: 0, erros: 0, tempoMs: 0, inicioItem: 0, pausado: false, avancando: null,
  };
  $('#jogoTitulo').textContent = cfg.tipo === 'fase' ? `${NOMES_NIVEL[cfg.n]} · Fase ${cfg.f + 1}`
    : cfg.tipo === 'tema' ? `Tema: ${TEMAS[cfg.tema][0]}` : cfg.tipo === 'frases' ? 'Minhas frases' : 'Revisão';
  ir('jogo');
  mostrarItem();
}
function mostrarItem() {
  const p = J.palavras[J.i];
  if (p.soFrase) J.etapa = 'frase'; // frases salvas da conversa: só a frase
  J.alvo = J.etapa === 'palavra' ? p.alvo : p.fr;
  J.pos = 0; J.errosItem = 0; J.inicioItem = 0; J.errosPos = new Set();
  $('#cpEmoji').textContent = emojiDe(p);
  $('#cpTema').textContent = (TEMAS[p.tema] || [''])[0];
  $('#cpEtapa').textContent = J.etapa === 'palavra' ? `Palavra ${J.i + 1} de ${J.palavras.length} · digite a palavra` : p.soFrase ? `Frase ${J.i + 1} de ${J.palavras.length}` : 'Agora digite a frase';
  const area = $('#areaDigitar');
  area.className = 'digitar' + (J.etapa === 'palavra' ? ' palavra' : '');
  area.innerHTML = [...J.alvo].map(ch => `<span class="c${ch === ' ' ? ' espaco' : ''}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  atualizarCursor();
  const mostrarDica = J.dicasPorPalavra[p.id];
  renderDica(p, mostrarDica);
  $('#jogoBarra').style.width = `${100 * (J.i + (J.etapa === 'frase' ? 0.5 : 0)) / J.palavras.length}%`;
  if (E.config.autoFalar) falar(J.alvo);
  focarCaptura();
}
function renderDica(p, mostrar) {
  const d = $('#cpDica');
  d.hidden = !mostrar;
  if (mostrar) d.innerHTML = `<b>${esc(p.alvo)}</b> = ${esc(p.pt)}${J.etapa === 'frase' ? `<br>${esc(p.frpt)}` : ''}`;
}
function atualizarCursor() {
  const cs = $('#areaDigitar').children;
  for (let k = 0; k < cs.length; k++) {
    cs[k].classList.toggle('ok', k < J.pos);
    cs[k].classList.toggle('errou-antes', k < J.pos && J.errosPos.has(k));
    cs[k].classList.toggle('cursor', k === J.pos);
  }
}
function igual(a, b) {
  const n = s => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  a = n(a); b = n(b);
  return E.config.ignorarMaiusc ? a.toLowerCase() === b.toLowerCase() : a === b;
}
function teclaJogo(e) {
  if (!J || J.pausado) return;
  if (e.key === 'Tab') { e.preventDefault(); falar(J.alvo); return; }
  if ((e.ctrlKey && e.code === 'Space') || (e.ctrlKey && e.key === ' ')) { e.preventDefault(); usarDica(); return; }
  if (e.key === 'Escape') { e.preventDefault(); ir(J.cfg.tipo === 'fase' ? 'vocab' : 'inicio'); return; }
  if (e.key === 'Enter') { e.preventDefault(); if (J.avancando) { clearTimeout(J.avancando); avancar(); } return; }
}
// os caracteres chegam pelo evento "input" do campo escondido: funciona com teclado ABNT,
// acentos/teclas mortas (' e ") e teclados virtuais.
function entradaJogo(e) {
  const campo = e.target;
  if (e.isComposing) return;
  const txt = campo.value;
  campo.value = '';
  if (!J || J.pausado || J.avancando) return;
  for (const ch of txt) { if (!J || J.avancando) break; digitarChar(ch); }
}
function digitarChar(ch) {
  if (ch === '\n') return;
  if (!J.inicioItem) J.inicioItem = performance.now();
  const esperado = J.alvo[J.pos];
  const area = $('#areaDigitar');
  if (igual(ch, esperado)) {
    J.pos++; J.chars++;
    atualizarCursor();
    if (J.pos >= J.alvo.length) concluirItem();
  } else {
    J.erros++; J.errosItem++; J.errosPos.add(J.pos);
    const p = J.palavras[J.i];
    J.errosPorPalavra[p.id] = (J.errosPorPalavra[p.id] || 0) + 1;
    const c = area.children[J.pos];
    c?.classList.add('errou');
    setTimeout(() => c?.classList.remove('errou'), 250);
    area.classList.remove('tremer'); void area.offsetWidth; area.classList.add('tremer');
  }
  metricasJogo();
}
function metricasJogo() {
  const ms = J.tempoMs + (J.inicioItem ? performance.now() - J.inicioItem : 0);
  $('#mPpm').textContent = ms > 1500 ? Math.round((J.chars / 5) / (ms / 60000)) : 0;
  $('#mPrec').textContent = J.chars + J.erros ? Math.round(100 * J.chars / (J.chars + J.erros)) : 100;
}
function concluirItem() {
  J.tempoMs += performance.now() - J.inicioItem;
  J.inicioItem = 0;
  $('#areaDigitar').classList.add('feito');
  J.avancando = setTimeout(avancar, J.etapa === 'palavra' ? 350 : 700);
}
function avancar() {
  J.avancando = null;
  if (J.etapa === 'palavra') { J.etapa = 'frase'; mostrarItem(); return; }
  J.etapa = 'palavra'; J.i++;
  if (J.i >= J.palavras.length) terminarFase(); else mostrarItem();
}
function usarDica() {
  const p = J.palavras[J.i];
  J.dicasPorPalavra[p.id] = true;
  renderDica(p, true);
}
function pararJogo() { if (J?.avancando) clearTimeout(J.avancando); speechSynthesis?.cancel(); J = null; }
const focarCaptura = () => $('#captura').focus({ preventScroll: true });
document.addEventListener('keydown', e => { if (telaAtual === 'jogo') teclaJogo(e); });
$('#captura').addEventListener('input', entradaJogo);
$('#captura').addEventListener('compositionend', entradaJogo);
$('#captura').addEventListener('blur', () => { $('#avisoFoco').style.visibility = telaAtual === 'jogo' ? 'visible' : 'hidden'; });
$('#captura').addEventListener('focus', () => { $('#avisoFoco').style.visibility = 'hidden'; });
$('#btnOuvir').onclick = () => { falar(J?.alvo); focarCaptura(); };
$('#btnDica').onclick = () => { usarDica(); focarCaptura(); };
$('#btnSairJogo').onclick = () => ir(J?.cfg.tipo === 'fase' ? 'vocab' : 'inicio');
$('#tela-jogo').addEventListener('click', e => { if (!e.target.closest('#btnSairJogo')) focarCaptura(); });

let ultimoResultado = null;
function terminarFase() {
  const seg = J.tempoMs / 1000;
  const ppm = seg > 0 ? Math.round((J.chars / 5) / (seg / 60)) : 0;
  const prec = J.chars + J.erros ? Math.round(100 * J.chars / (J.chars + J.erros)) : 100;
  const estrelas = prec >= 95 ? 3 : prec >= 85 ? 2 : 1;
  const nDicas = Object.keys(J.dicasPorPalavra).length;
  // registra palavras
  J.palavras.forEach(p => {
    const s = stPalavra(p.id);
    const er = J.errosPorPalavra[p.id] || 0, di = !!J.dicasPorPalavra[p.id];
    s.vistas++; s.erros += er; if (di) s.dicas++;
    if (!er && !di) s.limpas++;
    s.ultima = hoje();
  });
  // registra fase (dica não tira estrela, só fica registrada)
  if (J.cfg.tipo === 'fase') {
    const k = chaveFase(J.cfg.n, J.cfg.f);
    const ant = E.fases[k] || {};
    E.fases[k] = {
      estrelas: Math.max(ant.estrelas || 0, estrelas), ppm: Math.max(ant.ppm || 0, ppm),
      prec: Math.max(ant.prec || 0, prec), dicas: nDicas, vezes: (ant.vezes || 0) + 1,
    };
  }
  const d = dia();
  d.seg += seg; d.chars += J.chars; d.erros += J.erros; d.fases++;
  salvar();
  ultimoResultado = { cfg: J.cfg, palavras: J.palavras, errosPorPalavra: J.errosPorPalavra, dicasPorPalavra: J.dicasPorPalavra, ppm, prec, estrelas, seg, nDicas };
  J = null;
  ir('fim');
}
RENDER.fim = () => {
  const r = ultimoResultado;
  if (!r) return ir('vocab');
  $('#fimEstrelas').innerHTML = estrelasHtml(r.estrelas);
  $('#fimTitulo').textContent = ['', 'Fase concluída!', 'Muito bem!', 'Perfeito!'][r.estrelas];
  $('#fimNumeros').innerHTML = `
    <div><b>${r.ppm}</b>palavras/min</div>
    <div><b>${r.prec}%</b>precisão</div>
    <div><b>${fmtSeg(r.seg)}</b>tempo</div>
    <div><b>${r.nDicas}</b>dica${r.nDicas === 1 ? '' : 's'} usada${r.nDicas === 1 ? '' : 's'}</div>`;
  $('#fimTabela').innerHTML = r.palavras.map(p => linhaPalavra(p, r.errosPorPalavra[p.id] || 0, !!r.dicasPorPalavra[p.id])).join('');
  ligarBotoesSom($('#fimTabela'));
  const { cfg } = r;
  $('#btnRepetir').onclick = () => cfg.tipo === 'fase' || cfg.tipo === 'frases' ? iniciarFase(cfg) : cfg.tipo === 'tema' ? iniciarTema(cfg.tema) : iniciarRevisao();
  const btnP = $('#btnProxima');
  if (cfg.tipo === 'fase') {
    let { n, f } = cfg; f++;
    if (f >= FASES_POR_NIVEL[n]) { n++; f = 0; }
    btnP.hidden = n >= FASES_POR_NIVEL.length;
    btnP.textContent = 'Próxima fase →';
    btnP.onclick = () => iniciarFase({ tipo: 'fase', n, f });
  } else {
    btnP.hidden = false;
    btnP.hidden = cfg.tipo === 'frases';
    btnP.textContent = cfg.tipo === 'tema' ? 'Mais deste tema →' : 'Continuar revisando →';
    btnP.onclick = () => cfg.tipo === 'tema' ? iniciarTema(cfg.tema) : iniciarRevisao();
  }
};
function linhaPalavra(p, erros, dica) {
  const tags = [
    erros ? `<span class="tag erro">${erros} erro${erros > 1 ? 's' : ''}</span>` : '',
    dica ? '<span class="tag dica">dica</span>' : '',
    erros === 0 && !dica ? '<span class="tag ok">✓</span>' : '',
  ].join('');
  return `<div class="linha-palavra">
    <div class="lp-emoji">${emojiDe(p)}</div>
    <div class="lp-w">${esc(p.alvo)}<span class="lp-pt">${esc(p.pt)}</span></div>
    <div class="lp-frase">${esc(p.fr)}<span>${esc(p.frpt)}</span></div>
    <div class="lp-tags">${tags}<button class="btn-som" data-falar="${esc(p.alvo)}" title="Ouvir palavra">🔊</button><button class="btn-som" data-falar="${esc(p.fr)}" title="Ouvir frase">💬</button></div>
  </div>`;
}
function ligarBotoesSom(raiz) { raiz.querySelectorAll('[data-falar]').forEach(b => b.onclick = () => falar(b.dataset.falar)); }

// ---------- REVISÃO ----------
function palavrasRevisao() {
  return PALAVRAS.map(p => ({ p, s: E.palavras[p.id] }))
    .filter(({ s }) => s && (s.erros > 0 || s.dicas > 0))
    .map(({ p, s }) => ({ p, s, peso: (s.erros + s.dicas * 2) / (1 + s.limpas * 2) }))
    .filter(x => x.peso >= 0.5)
    .sort((a, b) => b.peso - a.peso);
}
function iniciarRevisao() {
  const lista = palavrasRevisao().slice(0, 30).map(x => x.p);
  if (!lista.length) return ir('revisao');
  iniciarFase({ tipo: 'revisao', palavras: embaralhar(lista).slice(0, POR_FASE) });
}
RENDER.revisao = () => {
  const lista = palavrasRevisao();
  const c = $('#revisaoConteudo');
  if (!lista.length) { c.innerHTML = '<div class="vazio">Nenhuma palavra para revisar. Quando você errar ou pedir dica, a palavra aparece aqui.</div>'; return; }
  c.innerHTML = `<div class="fim-botoes esq" style="margin:0 0 1rem"><button class="btn primario" id="btnIniciarRev">Começar revisão (${Math.min(POR_FASE, lista.length)} palavras)</button></div>
    <div class="tabela-fim">${lista.slice(0, 40).map(({ p, s }) => linhaPalavra(p, s.erros, s.dicas > 0)).join('')}</div>`;
  $('#btnIniciarRev').onclick = iniciarRevisao;
  ligarBotoesSom(c);
};

// ---------- DICIONÁRIO ----------
(function montarFiltros() {
  $('#filtroNivel').innerHTML += NOMES_NIVEL.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  $('#filtroTema').innerHTML += Object.entries(TEMAS).map(([k, [n, ic]]) => `<option value="${k}">${ic} ${n}</option>`).join('');
  ['#buscaPalavra', '#filtroNivel', '#filtroTema'].forEach(s => $(s).addEventListener('input', () => RENDER.dicionario()));
})();
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
RENDER.dicionario = () => {
  const q = semAcento($('#buscaPalavra').value.trim());
  const nv = $('#filtroNivel').value, tm = $('#filtroTema').value;
  const lista = PALAVRAS.filter(p => (nv === '' || p.nivel === +nv) && (tm === '' || p.tema === tm) &&
    (!q || semAcento(p.w).includes(q) || semAcento(p.pt).includes(q)));
  $('#dicContagem').textContent = `${lista.length} palavra${lista.length === 1 ? '' : 's'}`;
  $('#listaDic').innerHTML = lista.slice(0, 200).map(p => {
    const s = E.palavras[p.id];
    return linhaPalavra(p, s?.erros || 0, (s?.dicas || 0) > 0).replace('<span class="tag ok">✓</span>', s?.limpas ? '<span class="tag ok">✓ dominada</span>' : `<span class="tag">${NOMES_NIVEL[p.nivel]}</span>`);
  }).join('') + (lista.length > 200 ? '<p class="contagem">Mostrando as 200 primeiras. Refine a busca.</p>' : '');
  ligarBotoesSom($('#listaDic'));
};

// ---------- ESTATÍSTICAS ----------
RENDER.stats = () => {
  $('#statsResumo').innerHTML = kpis(totais());
  // gráfico de 14 dias
  const dias = [];
  for (let k = 13; k >= 0; k--) {
    const d = new Date(); d.setDate(d.getDate() - k);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dias.push({ rot: `${d.getDate()}/${d.getMonth() + 1}`, min: Math.round((E.dias[chave]?.seg || 0) / 60) });
  }
  const max = Math.max(5, ...dias.map(d => d.min));
  const W = 700, H = 180, bw = W / 14;
  $('#statsGrafico').innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Minutos por dia">
    ${dias.map((d, i) => {
      const h = (H - 40) * d.min / max;
      return `<rect class="barra" x="${i * bw + bw * 0.2}" y="${H - 22 - h}" width="${bw * 0.6}" height="${Math.max(h, d.min ? 2 : 0)}" rx="3"></rect>
        ${d.min ? `<text class="valor" x="${i * bw + bw / 2}" y="${H - 26 - h}" text-anchor="middle">${d.min}</text>` : ''}
        <text class="rotulo" x="${i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${d.rot}</text>`;
    }).join('')}</svg>`;
  const piores = PALAVRAS.map(p => ({ p, s: E.palavras[p.id] })).filter(x => x.s?.erros > 0)
    .sort((a, b) => b.s.erros - a.s.erros).slice(0, 12);
  $('#statsErros').innerHTML = piores.length
    ? `<div class="tabela-fim">${piores.map(({ p, s }) => linhaPalavra(p, s.erros, s.dicas > 0)).join('')}</div>`
    : '<div class="vazio">Nenhum erro registrado ainda.</div>';
  ligarBotoesSom($('#statsErros'));
  // configurações
  carregarVozes();
  $('#cfgVel').value = E.config.vel;
  $('#cfgVelTxt').textContent = E.config.vel + 'x';
  $('#cfgMaiusc').checked = E.config.ignorarMaiusc;
  $('#cfgAutoFalar').checked = E.config.autoFalar;
};
$('#cfgVoz').onchange = e => { E.config.voz = e.target.value; salvar(); falar('Hello! This is my voice.'); };
$('#cfgVel').oninput = e => { E.config.vel = +e.target.value; $('#cfgVelTxt').textContent = E.config.vel + 'x'; salvar(); };
$('#cfgVel').onchange = () => falar('How are you today?');
$('#cfgMaiusc').onchange = e => { E.config.ignorarMaiusc = e.target.checked; salvar(); };
$('#cfgAutoFalar').onchange = e => { E.config.autoFalar = e.target.checked; salvar(); };
$('#btnExportar').onclick = () => {
  const copia = { ...E, config: { ...E.config, chaveGemini: undefined } }; // a chave da API não vai para o backup
  const blob = new Blob([JSON.stringify(copia, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `treino-ingles-backup-${hoje()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#arqImportar').onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const dados = JSON.parse(await f.text());
    if (!dados.fases || !dados.palavras) throw new Error('formato');
    if (!confirm('Substituir o progresso atual pelo do backup?')) return;
    E = { ...estadoPadrao(), ...dados, config: { ...estadoPadrao().config, ...dados.config, chaveGemini: E.config.chaveGemini } };
    salvar(); aplicarTema(); RENDER.stats();
    alert('Backup importado!');
  } catch (err) { alert('Arquivo de backup inválido.'); }
  e.target.value = '';
};
$('#btnZerar').onclick = () => {
  if (!confirm('Apagar TODO o progresso? Isso não pode ser desfeito.')) return;
  const cfg = E.config;
  E = estadoPadrao(); E.config = cfg;
  salvar(); RENDER.stats();
};

// ---------- início ----------
window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (t && t !== telaAtual && RENDER[t]) ir(t); });
document.addEventListener('DOMContentLoaded', () => {
  const t = location.hash.slice(1);
  ir(RENDER[t] && !['jogo', 'fim'].includes(t) ? t : 'inicio');
});
