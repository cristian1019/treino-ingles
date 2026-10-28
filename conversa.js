'use strict';
/* =====================================================================
   Conversa com IA — Google Gemini (chave do próprio usuário)
   Fala → texto: reconhecimento de voz do navegador (Chrome/Edge)
   Texto → fala: speechSynthesis (função falar() do app.js)
   ===================================================================== */

const API_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

const CENARIOS = [
  { id: 'livre', icone: '💬', nome: 'Conversa livre', desc: 'Fale sobre seu dia, hobbies e planos.', papel: 'a friendly conversation partner chatting casually about everyday life, hobbies and plans' },
  { id: 'apresentacao', icone: '👋', nome: 'Conhecendo alguém', desc: 'Apresente-se e faça perguntas.', papel: 'a friendly person the student just met at a party; you both introduce yourselves' },
  { id: 'cafeteria', icone: '☕', nome: 'Cafeteria', desc: 'Pedir um café e um lanche.', papel: 'a barista at a coffee shop; the student is the customer ordering' },
  { id: 'restaurante', icone: '🍽️', nome: 'Restaurante', desc: 'Pedir comida, tirar dúvidas, pagar a conta.', papel: 'a waiter at a casual restaurant; the student is the customer' },
  { id: 'compras', icone: '🛍️', nome: 'Loja de roupas', desc: 'Tamanho, cor, preço e provador.', papel: 'a shop assistant in a clothing store; the student is a customer' },
  { id: 'aeroporto', icone: '✈️', nome: 'Aeroporto', desc: 'Check-in, bagagem e portão de embarque.', papel: 'an airline check-in agent at the airport; the student is a passenger' },
  { id: 'hotel', icone: '🏨', nome: 'Hotel', desc: 'Fazer check-in e pedir informações.', papel: 'a hotel receptionist; the student is a guest checking in' },
  { id: 'direcoes', icone: '🗺️', nome: 'Pedindo direções', desc: 'Perguntar como chegar a um lugar.', papel: 'a local person on the street in a big city; the student is a tourist asking for directions' },
  { id: 'medico', icone: '🩺', nome: 'Consulta médica', desc: 'Explicar sintomas ao médico.', papel: 'a doctor in an appointment; the student is the patient describing symptoms' },
  { id: 'entrevista', icone: '💼', nome: 'Entrevista de emprego', desc: 'Falar de experiência e qualidades.', papel: 'a job interviewer at a company; the student is the candidate' },
];
const NIVEIS_IA = {
  iniciante: 'A1 (beginner): very short and simple sentences (max 10 words), basic everyday words, mostly present tense. Speak slowly and clearly.',
  basico: 'A2 (elementary): short simple sentences, common vocabulary, present and past tense.',
  intermediario: 'B1 (intermediate): natural sentences, common idioms and phrasal verbs are fine.',
  avancado: 'B2/C1 (advanced): fully natural spoken English with idioms and varied grammar.',
};
const NOMES_NIVEL_IA = { iniciante: 'Iniciante', basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado' };

const ESQUEMA_RESPOSTA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    reply_pt: { type: 'STRING' },
    has_mistake: { type: 'BOOLEAN' },
    corrected: { type: 'STRING' },
    explanation_pt: { type: 'STRING' },
    tip_pt: { type: 'STRING' },
    new_phrase: { type: 'STRING' },
    new_phrase_pt: { type: 'STRING' },
  },
  required: ['reply', 'reply_pt', 'has_mistake', 'corrected', 'explanation_pt', 'tip_pt', 'new_phrase', 'new_phrase_pt'],
};

function instrucoes(cenario, nivel) {
  return `You are an English conversation tutor for a Brazilian student (native language: Brazilian Portuguese).
Role-play: you are ${cenario.papel}. Stay in character and keep the conversation going naturally.
Student level: ${NIVEIS_IA[nivel]}

Answer ONLY with the JSON object. Fields:
- "reply": your spoken answer in English, 1 to 3 short sentences, natural spoken style (it will be read aloud). Always end with a question or a prompt so the student keeps talking.
- "reply_pt": translation of "reply" into Brazilian Portuguese.
- "has_mistake": true if the student's LAST message has grammar, vocabulary or word-choice mistakes, or sounds unnatural in English. Ignore capitalization and punctuation (the message was transcribed from speech). If the student wrote in Portuguese, set true and give the English version.
- "corrected": the corrected, natural English version of the student's whole last message (empty string if no mistake).
- "explanation_pt": short explanation of the correction in Brazilian Portuguese, 1 or 2 sentences (empty if no mistake).
- "tip_pt": one short, useful tip in Brazilian Portuguese about grammar, pronunciation, vocabulary or culture related to this moment of the conversation (may be empty).
- "new_phrase": one useful, natural English phrase (max 12 words) the student could say next in this situation.
- "new_phrase_pt": translation of "new_phrase" into Brazilian Portuguese.

When the student's message is "[START]", greet the student and start the scenario (has_mistake false, corrected and explanation_pt empty).`;
}

// ---------- estado ----------
let C = null; // conversa atual
const conf = () => E.config;

// ---------- API do Gemini ----------
class ErroApi extends Error {}
async function pedirApi(caminho, opcoes = {}) {
  let r;
  try {
    r = await fetch(`${API_GEMINI}/${caminho}`, {
      ...opcoes,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': conf().chaveGemini || '', ...(opcoes.headers || {}) },
    });
  } catch (e) {
    throw new ErroApi('Sem conexão com o Google. Verifique a internet.');
  }
  if (!r.ok) {
    const det = await r.json().catch(() => ({}));
    const msg = det.error?.message || '';
    if (r.status === 429) throw new ErroApi('Limite gratuito da API atingido. Espere um minuto e tente de novo (o limite diário renova à meia-noite do horário do Pacífico).');
    if (r.status === 400 && /API key/i.test(msg)) throw new ErroApi('Chave inválida. Confira se copiou a chave inteira.');
    if (r.status === 403) throw new ErroApi('A chave não tem permissão para usar a API do Gemini. Crie uma chave nova no Google AI Studio.');
    if (r.status === 404) throw new ErroApi('Modelo não encontrado. Escolha outro modelo na lista.');
    throw new ErroApi(`Erro da API (${r.status}). ${msg}`);
  }
  return r.json();
}
async function listarModelos() {
  const j = await pedirApi('models?pageSize=200');
  const nomes = (j.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => /flash/.test(n) && !/image|tts|audio|live|embedding|thinking|robotics|computer/.test(n));
  // ordena: aliases "latest" primeiro, depois versões mais novas; versões estáveis antes de preview
  const versao = n => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]);
  nomes.sort((a, b) => (/latest/.test(b) - /latest/.test(a)) || (versao(b) - versao(a)) || (/preview|exp/.test(a) - /preview|exp/.test(b)) || a.localeCompare(b));
  return nomes;
}
async function gerarResposta() {
  const corpo = {
    systemInstruction: { parts: [{ text: instrucoes(C.cenario, C.nivel) }] },
    contents: C.historico.slice(-24),
    generationConfig: { responseMimeType: 'application/json', responseSchema: ESQUEMA_RESPOSTA, temperature: 0.8 },
  };
  const j = await pedirApi(`models/${encodeURIComponent(conf().modeloGemini)}:generateContent`, { method: 'POST', body: JSON.stringify(corpo) });
  const partes = j.candidates?.[0]?.content?.parts || [];
  const texto = partes.filter(p => !p.thought).map(p => p.text || '').join('');
  try { return JSON.parse(texto); }
  catch (e) { throw new ErroApi('A IA mandou uma resposta incompleta. Tente de novo.'); }
}

// ---------- telas ----------
function mostrarParte(qual) {
  ['convConfig', 'convInicio', 'convChat', 'convResumo'].forEach(id => { $('#' + id).hidden = id !== qual; });
}
RENDER.conversa = () => {
  if (!conf().chaveGemini) { mostrarParte('convConfig'); return; }
  if (C && !C.fim) { mostrarParte('convChat'); $('#convTexto').focus(); return; }
  if (C && C.fim) { mostrarParte('convResumo'); return; }
  mostrarParte('convInicio');
  $('#convCenarios').innerHTML = CENARIOS.map(c => `<button class="cenario" data-c="${c.id}">
      <span class="ce-icone">${c.icone}</span><span class="ce-nome">${esc(c.nome)}</span><span class="ce-desc">${esc(c.desc)}</span></button>`).join('');
  $$('#convCenarios .cenario').forEach(b => b.onclick = () => iniciarConversa(b.dataset.c));
  $('#convNivel').value = conf().nivelConversa || 'iniciante';
  preencherModelos();
  const aviso = $('#convAvisoMic');
  aviso.hidden = microfoneDisponivel();
  aviso.innerHTML = 'Para falar com o microfone, abra o app no <b>Google Chrome</b> ou no <b>Microsoft Edge</b>. Neste navegador você ainda pode conversar digitando.';
};
async function preencherModelos(forcar) {
  const sel = $('#convModelo');
  if (!forcar && conf().modelosGemini?.length) {
    sel.innerHTML = conf().modelosGemini.map(m => `<option>${esc(m)}</option>`).join('');
    sel.value = conf().modeloGemini;
    return;
  }
  const lista = await listarModelos();
  if (!lista.length) throw new ErroApi('Nenhum modelo Gemini Flash disponível para esta chave.');
  conf().modelosGemini = lista;
  if (!lista.includes(conf().modeloGemini)) conf().modeloGemini = lista[0];
  salvar();
  sel.innerHTML = lista.map(m => `<option>${esc(m)}</option>`).join('');
  sel.value = conf().modeloGemini;
}
$('#convModelo').onchange = e => { conf().modeloGemini = e.target.value; salvar(); };
$('#convNivel').onchange = e => { conf().nivelConversa = e.target.value; salvar(); };
$('#convTrocarChave').onclick = () => { $('#convChave').value = conf().chaveGemini || ''; mostrarParte('convConfig'); };
$('#convSalvarChave').onclick = async () => {
  const st = $('#convStatusChave');
  const chave = $('#convChave').value.trim();
  if (!chave) { st.className = 'conv-status erro'; st.textContent = 'Cole a chave primeiro.'; return; }
  const anterior = conf().chaveGemini;
  conf().chaveGemini = chave;
  st.className = 'conv-status'; st.textContent = 'Testando a chave…';
  try {
    await preencherModelos(true);
    salvar();
    st.className = 'conv-status ok'; st.textContent = `Chave funcionando! Modelo escolhido: ${conf().modeloGemini}`;
    setTimeout(() => RENDER.conversa(), 900);
  } catch (e) {
    conf().chaveGemini = anterior;
    st.className = 'conv-status erro'; st.textContent = e.message;
  }
};

// ---------- conversa ----------
async function iniciarConversa(idCenario) {
  const cenario = CENARIOS.find(c => c.id === idCenario);
  C = {
    cenario, nivel: $('#convNivel').value, historico: [{ role: 'user', parts: [{ text: '[START]' }] }],
    correcoes: [], frases: [], falas: 0, inicio: Date.now(), ultimo: Date.now(), ocupado: false, fim: false,
  };
  $('#convTitulo').textContent = `${cenario.icone} ${cenario.nome} · ${NOMES_NIVEL_IA[C.nivel]}`;
  $('#convMensagens').innerHTML = '';
  $('#convMic').disabled = !microfoneDisponivel();
  mostrarParte('convChat');
  await responder();
}
function status(txt, tipo = '') { const s = $('#convStatus'); s.className = 'conv-status ' + tipo; s.textContent = txt; }
async function responder(tentativa = 0) {
  C.ocupado = true;
  const pensando = adicionarMsg('ia', '<span class="digitando">digitando…</span>');
  status('');
  try {
    const r = await gerarResposta();
    if (!C) return;
    C.historico.push({ role: 'model', parts: [{ text: r.reply }] });
    pensando.remove();
    renderRespostaIA(r);
    falar(r.reply);
  } catch (e) {
    pensando.remove();
    status(e.message + ' ', 'erro');
    const tentar = document.createElement('button');
    tentar.className = 'btn'; tentar.textContent = 'Tentar de novo';
    tentar.onclick = () => { status(''); responder(tentativa + 1); };
    $('#convStatus').appendChild(tentar);
  } finally {
    if (C) C.ocupado = false;
    $('#convTexto').focus();
  }
}
function adicionarMsg(quem, html) {
  const m = document.createElement('div');
  m.className = 'msg ' + quem;
  m.innerHTML = `<div class="balao">${html}</div>`;
  $('#convMensagens').appendChild(m);
  m.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return m;
}
function renderRespostaIA(r) {
  // painel do professor sobre a última fala do aluno
  const ultimaVoce = [...$$('#convMensagens .msg.voce')].pop();
  if (ultimaVoce && (r.has_mistake && r.corrected)) {
    C.correcoes.push({ original: ultimaVoce.dataset.texto, corrigido: r.corrected, explicacao: r.explanation_pt });
    const p = document.createElement('div');
    p.className = 'professor';
    p.innerHTML = `<div class="p-linha">✏️ <b>Correção:</b> <span class="riscado">${esc(ultimaVoce.dataset.texto)}</span> → <span class="certo">${esc(r.corrected)}</span>
      <button class="btn-som" data-falar="${esc(r.corrected)}">🔊</button></div>
      ${r.explanation_pt ? `<div class="p-linha">${esc(r.explanation_pt)}</div>` : ''}`;
    ultimaVoce.appendChild(p);
    ligarBotoesSom(p);
  } else if (ultimaVoce) {
    const ok = document.createElement('div');
    ok.className = 'professor';
    ok.innerHTML = '<div class="p-linha">✅ <b>Perfeito!</b> Sua frase está correta.</div>';
    ultimaVoce.appendChild(ok);
  }
  const m = adicionarMsg('ia', `${esc(r.reply)}
    <span class="trad" hidden>🇧🇷 ${esc(r.reply_pt)}</span>
    <span class="acoes"><button data-acao="ouvir">🔊 Ouvir</button><button data-acao="trad">🇧🇷 Tradução</button></span>`);
  m.querySelector('[data-acao="ouvir"]').onclick = () => falar(r.reply);
  m.querySelector('[data-acao="trad"]').onclick = () => { const t = m.querySelector('.trad'); t.hidden = !t.hidden; };
  if (r.tip_pt || r.new_phrase) {
    const p = document.createElement('div');
    p.className = 'professor';
    p.innerHTML = `${r.tip_pt ? `<div class="p-linha">💡 <b>Dica:</b> ${esc(r.tip_pt)}</div>` : ''}
      ${r.new_phrase ? `<div class="p-linha frase-nova">⭐ <b>Frase nova:</b> <i>${esc(r.new_phrase)}</i> — ${esc(r.new_phrase_pt)}
        <button data-acao="ouvir">🔊</button><button data-acao="repetir">🎤 Repetir</button><button data-acao="salvar">Salvar</button>
        <span class="pron"></span></div>` : ''}`;
    m.appendChild(p);
    if (r.new_phrase) {
      const fr = { en: r.new_phrase, pt: r.new_phrase_pt };
      C.frases.push(fr);
      p.querySelector('[data-acao="ouvir"]').onclick = () => falar(fr.en);
      const bs = p.querySelector('[data-acao="salvar"]');
      bs.onclick = () => { salvarFrase(fr); bs.textContent = '✓ Salva'; bs.disabled = true; };
      const br = p.querySelector('[data-acao="repetir"]');
      br.disabled = !microfoneDisponivel();
      br.onclick = () => repetirFrase(fr.en, p.querySelector('.pron'));
    }
  }
  m.scrollIntoView({ behavior: 'smooth', block: 'end' });
}
async function enviarTexto(texto) {
  texto = (texto || '').trim();
  if (!texto || !C || C.ocupado) return;
  $('#convTexto').value = '';
  speechSynthesis?.cancel();
  const m = adicionarMsg('voce', esc(texto));
  m.dataset.texto = texto;
  C.historico.push({ role: 'user', parts: [{ text: texto }] });
  C.falas++;
  const d = dia();
  d.falas = (d.falas || 0) + 1;
  d.seg += Math.min(90, (Date.now() - C.ultimo) / 1000);
  C.ultimo = Date.now();
  salvar();
  await responder();
}
$('#convEnviar').onclick = () => enviarTexto($('#convTexto').value);
$('#convTexto').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviarTexto(e.target.value); } });
$('#convSair').onclick = () => { pararConversa(); C = null; RENDER.conversa(); };
$('#convEncerrar').onclick = () => encerrarConversa();
$('#convNova').onclick = () => { C = null; RENDER.conversa(); };
$('#convPraticarFrases').onclick = () => iniciarFrases();

function salvarFrase(fr) {
  E.frases ||= [];
  if (!E.frases.some(x => x.en.toLowerCase() === fr.en.toLowerCase())) {
    E.frases.push({ en: fr.en, pt: fr.pt, data: hoje() });
    salvar();
  }
}
function encerrarConversa() {
  if (!C) return;
  pararConversa();
  C.fim = true;
  C.frases.forEach(salvarFrase); // todas as frases novas vão para "Minhas frases"
  const min = Math.max(1, Math.round((Date.now() - C.inicio) / 60000));
  $('#convResumoNumeros').innerHTML = `
    <div class="kpi"><b>${C.falas}</b><span>vezes que você falou</span></div>
    <div class="kpi"><b>${C.correcoes.length}</b><span>correções</span></div>
    <div class="kpi"><b>${C.frases.length}</b><span>frases novas</span></div>
    <div class="kpi"><b>${min}</b><span>minuto${min > 1 ? 's' : ''}</span></div>`;
  $('#convResumoCorrecoes').innerHTML = C.correcoes.length
    ? `<div class="tabela-fim">${C.correcoes.map(c => `<div class="professor"><div class="p-linha"><span class="riscado">${esc(c.original)}</span> → <span class="certo">${esc(c.corrigido)}</span></div>${c.explicacao ? `<div class="p-linha">${esc(c.explicacao)}</div>` : ''}</div>`).join('')}</div>`
    : '<div class="vazio">Nenhuma correção. Mandou bem! 🎉</div>';
  $('#convResumoFrases').innerHTML = C.frases.length
    ? `<div class="tabela-fim">${C.frases.map(f => `<div class="linha-palavra"><div class="lp-emoji">⭐</div><div class="lp-w">${esc(f.en)}<span class="lp-pt">${esc(f.pt)}</span></div><div></div><div class="lp-tags"><button class="btn-som" data-falar="${esc(f.en)}">🔊</button></div></div>`).join('')}</div>
       <p class="contagem">As frases foram salvas em "Minhas frases" (tela Revisão) para você treinar digitando.</p>`
    : '<div class="vazio">Nenhuma frase nova nesta conversa.</div>';
  ligarBotoesSom($('#convResumo'));
  mostrarParte('convResumo');
  window.scrollTo(0, 0);
}

// ---------- "Minhas frases" (digitação) ----------
function iniciarFrases(lista) {
  lista = lista || embaralhar([...(E.frases || [])].slice(-40)).slice(0, POR_FASE);
  if (!lista.length) return ir('revisao');
  iniciarFase({
    tipo: 'frases', palavras: lista.map(f => ({
      id: 'frase:' + f.en.toLowerCase(), w: f.en, alvo: f.en, pt: f.pt, em: '⭐', tema: 'comunicacao',
      fr: f.en, frpt: f.pt, soFrase: true,
    })),
  });
}
const renderRevisaoOriginal = RENDER.revisao;
RENDER.revisao = () => {
  renderRevisaoOriginal();
  const frases = E.frases || [];
  const bloco = document.createElement('div');
  bloco.innerHTML = `<h3 class="mt">⭐ Minhas frases (${frases.length})</h3>
    ${frases.length
      ? `<div class="fim-botoes esq" style="margin:0 0 1rem"><button class="btn primario" id="btnFrases">Digitar frases (${Math.min(POR_FASE, frases.length)})</button></div>
         <div class="tabela-fim">${frases.slice().reverse().slice(0, 40).map((f, i) => `<div class="linha-palavra"><div class="lp-emoji">⭐</div><div class="lp-w">${esc(f.en)}<span class="lp-pt">${esc(f.pt)}</span></div><div class="lp-frase"><span>${esc(f.data || '')}</span></div>
           <div class="lp-tags"><button class="btn-som" data-falar="${esc(f.en)}">🔊</button><button class="btn-som" data-apagar="${frases.length - 1 - i}" title="Remover">🗑️</button></div></div>`).join('')}</div>`
      : '<div class="vazio">As frases novas que a IA ensinar na Conversa aparecem aqui.</div>'}`;
  $('#revisaoConteudo').appendChild(bloco);
  ligarBotoesSom(bloco);
  bloco.querySelector('#btnFrases')?.addEventListener('click', () => iniciarFrases());
  bloco.querySelectorAll('[data-apagar]').forEach(b => b.onclick = () => { E.frases.splice(+b.dataset.apagar, 1); salvar(); RENDER.revisao(); });
};

// ---------- microfone ----------
const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
function microfoneDisponivel() { return !!Reconhecimento && !navigator.brave; } // o Brave bloqueia o serviço de voz
let rec = null;
function ouvir(aoTerminar, aoParcial) {
  if (!microfoneDisponivel()) return null;
  speechSynthesis?.cancel();
  const r = new Reconhecimento();
  r.lang = 'en-US';
  r.interimResults = true;
  r.continuous = true;
  let final = '';
  r.onresult = ev => {
    let parcial = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) final += ev.results[i][0].transcript + ' ';
      else parcial += ev.results[i][0].transcript;
    }
    aoParcial?.((final + parcial).trim());
  };
  r.onerror = ev => {
    const msgs = {
      'not-allowed': 'Permita o uso do microfone no navegador (ícone de cadeado ao lado do endereço).',
      'no-speech': 'Não ouvi nada. Tente falar mais perto do microfone.',
      network: 'O reconhecimento de voz precisa de internet e funciona no Chrome ou no Edge.',
      'audio-capture': 'Nenhum microfone encontrado.',
    };
    status(msgs[ev.error] || 'Erro no microfone: ' + ev.error, 'erro');
  };
  r.onend = () => { $('#convMic').classList.remove('ouvindo'); rec = null; aoTerminar?.(final.trim()); };
  r.start();
  rec = r;
  return r;
}
function comecarFala() {
  if (rec || !C || C.ocupado || !microfoneDisponivel()) return;
  $('#convMic').classList.add('ouvindo');
  status('🎙️ Ouvindo… solte o Espaço (ou clique no microfone) quando terminar.');
  ouvir(texto => { status(''); if (texto) enviarTexto(texto); }, parcial => { $('#convTexto').value = parcial; });
}
function pararFala() { rec?.stop(); }
$('#convMic').onclick = () => (rec ? pararFala() : comecarFala());
document.addEventListener('keydown', e => {
  if (telaAtual !== 'conversa' || $('#convChat').hidden || e.code !== 'Space' || e.repeat) return;
  if (document.activeElement === $('#convTexto') && $('#convTexto').value) return; // digitando um espaço
  e.preventDefault();
  comecarFala();
});
document.addEventListener('keyup', e => {
  if (telaAtual === 'conversa' && e.code === 'Space' && rec) { e.preventDefault(); pararFala(); }
});
function repetirFrase(alvo, saida) {
  if (rec) return;
  saida.textContent = '🎙️ fale agora…';
  const r = ouvir(texto => {
    if (!texto) { saida.textContent = ''; return; }
    const res = comparar(alvo, texto);
    saida.innerHTML = `${res.nota >= 90 ? '🟢' : res.nota >= 60 ? '🟡' : '🔴'} ${res.nota}% — ouvi: "${esc(texto)}"`;
  });
  if (r) setTimeout(() => r.stop(), Math.max(3500, alvo.split(' ').length * 700));
}
window.pararConversa = function pararConversa() { rec?.abort(); rec = null; speechSynthesis?.cancel(); $('#convMic').classList.remove('ouvindo'); };
const pararConversa = window.pararConversa;

// ---------- comparação palavra por palavra (pronúncia) ----------
const HESITACAO = /^(uh+|um+|hm+|oh+|ah+|er+|huh|ooh)$/;
const normPalavra = w => w.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']/g, '').replace(/'/g, '');
const palavrasDe = s => s.split(/[\s—–-]+/).map(w => ({ orig: w, n: normPalavra(w) })).filter(w => w.n);
function comparar(alvoTxt, dito) {
  const A = palavrasDe(alvoTxt), B = palavrasDe(dito);
  const m = A.length, n = B.length;
  const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
    L[i][j] = A[i].n === B[j].n ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const total = A.filter(w => !HESITACAO.test(w.n)).length;
  return { nota: total ? Math.min(100, Math.round(100 * L[0][0] / total)) : 100 };
}
