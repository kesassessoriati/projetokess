const fs = require('fs');

const inputPath = 'tmp/n8n_trairi/trairi-debug-current-host.json';
const outputPath = 'tmp/n8n_trairi/trairi-workflow-hotfix-agenda-contract.json';

let wf = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (Array.isArray(wf)) wf = wf[0];

const byName = (name) => {
  const node = wf.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  return node;
};
const byPrefix = (prefix) => {
  const node = wf.nodes.find((n) => n.name.startsWith(prefix));
  if (!node) throw new Error(`Node not found by prefix: ${prefix}`);
  return node;
};

const roteador = byPrefix('Roteador de');
const validador = byPrefix('Validador Cr');
const atendente = byName('Atendente');

roteador.parameters.jsCode = String.raw`const item = $('Detector de Intenção e Entidades').first().json;
const state = item.state || {};
const entidades = item.entidades_detectadas || {};
const intencao = item.intencao_detectada || "outro";

const TZ = "America/Sao_Paulo";
const dias = ["domingo", "segunda-feira", "terca-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sabado"];
const pad = (n) => String(n).padStart(2, "0");
const br = (d) => pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function now() {
  const p = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value;
  return new Date(+g("year"), +g("month") - 1, +g("day"), +g("hour"), +g("minute"));
}

const week = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };

function parseDate(text) {
  const raw = norm(text);
  const today = start(now());
  if (!raw) return null;
  if (/\b(hoje|hj)\b/.test(raw)) return today;
  if (/\bamanha\b/.test(raw)) return add(today, 1);
  if (/\bdepois de amanha\b/.test(raw)) return add(today, 2);
  let m = raw.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (m) {
    const y = m[3] ? +(m[3].length === 2 ? "20" + m[3] : m[3]) : today.getFullYear();
    let d = new Date(y, +m[2] - 1, +m[1]);
    if (!m[3] && d < today) d = new Date(y + 1, +m[2] - 1, +m[1]);
    return d;
  }
  for (const [name, day] of Object.entries(week)) {
    if (new RegExp("\\b" + name + "\\b").test(raw)) {
      let diff = day - today.getDay();
      if (diff <= 0 || /proxim|que vem|semana que vem/.test(raw)) diff += 7;
      return add(today, diff);
    }
  }
  m = raw.match(/\bdia\s+(\d{1,2})\b/);
  if (m) {
    let d = new Date(today.getFullYear(), today.getMonth(), +m[1]);
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, +m[1]);
    return d;
  }
  return null;
}

function open(d) {
  if (d.getDay() === 0) return { open: false, reason: "Domingo - clinica fechada" };
  return { open: true, reason: null };
}

function slots(d) {
  return d.getDay() === 6 ? [8, 9, 10, 11, 12] : [8, 9, 10, 11, 14, 15, 16, 17];
}

const dataFonte = entidades.data_texto_original || state.data_desejada || "";
const parsedDate = parseDate(dataFonte);
let resultado_data = { sucesso: false };

if (parsedDate) {
  const today = start(now());
  const st = open(parsedDate);
  resultado_data = {
    sucesso: true,
    data_informada: br(parsedDate),
    data_iso: iso(parsedDate),
    dia_semana: dias[parsedDate.getDay()],
    classificacao: start(parsedDate) < today ? "passado" : start(parsedDate).getTime() === today.getTime() ? "presente" : "futuro",
    esta_aberto: start(parsedDate) >= today && st.open,
    motivo_fechado: start(parsedDate) < today ? "Data no passado" : st.reason
  };
}

const appointments = $('Puxa Agendamentos Ativos').all().map((x) => x.json || {}).filter((x) => x.start_datetime || x.data || x.date);
let resultado_agenda = { sucesso: false };
let resultado_horario = { sucesso: false };

const turnoTexto = norm(entidades.horario_texto_original || state.turno_desejado || "");
const temTurno = /\b(manha|tarde)\b/.test(turnoTexto);
const deveCalcularAgenda =
  resultado_data.sucesso &&
  resultado_data.esta_aberto &&
  (
    entidades.menciona_horario ||
    temTurno ||
    /coletando_(turno|horario|nome)/.test(state.leadStage || "") ||
    intencao === "quer_agendar" ||
    intencao === "informa_horario" ||
    intencao === "informa_nome"
  );

if (deveCalcularAgenda) {
  const occ = {};
  for (const a of appointments) {
    const st = String(a.status || a.etiqueta || "").toLowerCase();
    if (st === "cancelado" || st === "cancelled") continue;
    let date = String(a.start_datetime || a.data || a.date || "").slice(0, 10);
    let hour = null;
    if (a.start_datetime) {
      const dt = new Date(a.start_datetime);
      const brt = new Date(dt.getTime() - 3 * 3600000);
      date = iso(brt);
      hour = brt.getUTCHours();
    } else {
      const m = String(a.horario || a.hora || "").match(/(\d{1,2})/);
      if (m) hour = +m[1];
    }
    if (date === resultado_data.data_iso && hour != null) occ[hour] = (occ[hour] || 0) + 1;
  }

  let freeAll = slots(parsedDate).filter((h) => (occ[h] || 0) < 3);
  if (/manha/.test(turnoTexto)) freeAll = freeAll.filter((h) => h < 12);
  if (/tarde/.test(turnoTexto)) freeAll = freeAll.filter((h) => h >= 14 && h <= 17);

  const offer = freeAll.slice(0, 4);
  resultado_agenda = {
    sucesso: true,
    horarios_disponiveis: offer.map((h) => String(h) + "h"),
    total_disponiveis: offer.length,
    lista_numerada: offer.map((h, i) => String(i + 1) + ". " + String(h) + "h").join("\n")
  };

  if (intencao === "informa_horario" && entidades.horario_numerico !== null) {
    const selected = +entidades.horario_numerico;
    resultado_horario = {
      sucesso: true,
      horario_solicitado: String(selected) + "h",
      disponivel: freeAll.includes(selected),
      motivo: freeAll.includes(selected) ? null : "Horario solicitado nao esta disponivel"
    };
  }
}

const nomeDisponivelNesteTurno = Boolean(state.nome_completo) || intencao === "informa_nome";
let proxima = "dialogar";

if (intencao === "falar_humano") {
  proxima = "transferir_humano";
} else if (resultado_horario.sucesso && resultado_horario.disponivel && nomeDisponivelNesteTurno) {
  proxima = "confirmar_horario_escolhido";
} else if (resultado_horario.sucesso && !resultado_horario.disponivel) {
  proxima = "horario_indisponivel_oferecer_alternativas";
} else if (resultado_agenda.sucesso && resultado_agenda.total_disponiveis > 0 && temTurno) {
  proxima = "oferecer_horarios_validos";
} else if (resultado_data.sucesso && resultado_data.esta_aberto && !temTurno) {
  proxima = "coletar_turno";
} else if (!state.nome_completo && intencao !== "informa_nome" && /agendar|quer_agendar/.test(intencao)) {
  proxima = "coletar_nome";
} else if (!resultado_data.sucesso && (/coletando_data/.test(state.leadStage || "") || intencao === "quer_agendar")) {
  proxima = "coletar_data";
}

return [{
  json: {
    ...item,
    contexto_operacional: {
      estado_atual: state,
      intencao_detectada: intencao,
      entidades_detectadas: entidades,
      resultado_data,
      resultado_agenda,
      resultado_horario,
      proxima_acao_obrigatoria: proxima,
      regras: [
        "Responder somente JSON valido com chave mensagens",
        "Uma pergunta por vez",
        "Nao pedir CPF, RG, nascimento, idade, endereco ou email",
        "Se proxima_acao_obrigatoria=oferecer_horarios_validos, listar somente resultado_agenda.lista_numerada",
        "Nunca confirmar agendamento se resultado_horario.disponivel nao for true"
      ]
    }
  }
}];`;

validador.parameters.jsCode = String.raw`const item = $input.first()?.json || {};
const contexto = $('Roteador de Ferramentas Obrigatórias').first().json.contexto_operacional || {};

let raw = item.output ?? item.text ?? item.content ?? item.message ?? "";
if (typeof raw !== "string") raw = JSON.stringify(raw || {});

const cleaned = raw
  .replace(new RegExp(String.fromCharCode(96).repeat(3) + "json", "gi"), "")
  .replace(new RegExp(String.fromCharCode(96).repeat(3), "g"), "")
  .trim();
let parsed = null;
let reason = "";

try {
  parsed = JSON.parse(cleaned);
} catch (_) {
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) {
    try { parsed = JSON.parse(m[0]); } catch (_) {}
  }
}

if (!parsed) reason = "JSON invalido";
else if (!Array.isArray(parsed.mensagens)) reason = "Resposta sem chave mensagens em array";
else if (!parsed.mensagens.length) reason = "Lista mensagens vazia";
else if (parsed.mensagens.length > 5) reason = "Mais de 5 mensagens";

const mensagens = (parsed?.mensagens || []).map((m) => String(m).trim()).filter(Boolean);
const joined = mensagens.join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

if (!reason && /(consultar_dia_semana_code|consultar_agenda|criar_compromisso|verificar_agendamento_lead|tool_call|system prompt|raciocinio interno)/i.test(joined)) {
  reason = "Vazamento de ferramenta ou prompt";
}
if (!reason && /\b(cpf|rg|data de nascimento|nascimento|idade|endereco|email|e-mail)\b/i.test(joined)) {
  reason = "Pedido de dado pessoal proibido";
}
if (!reason && /\b(confirmad|agendad|reservad)\b/.test(joined) && !contexto.resultado_horario?.disponivel) {
  reason = "Confirmou agendamento sem horario validado";
}
if (!reason && /\b\d{1,2}(h|:\d{2})\b/.test(joined) && !contexto.resultado_agenda?.sucesso && !contexto.resultado_horario?.sucesso) {
  reason = "Ofereceu horario sem agenda validada";
}
if (!reason && /(segunda|terca|quarta|quinta|sexta|sabado|domingo)/i.test(joined) && !contexto.resultado_data?.sucesso) {
  reason = "Afirmou dia da semana sem data validada";
}
if (!reason && (joined.match(/\?/g) || []).length > 1) {
  reason = "Mais de uma pergunta na resposta";
}

let approved = !reason;
let mensagensSaida = mensagens;
let severity = reason ? "high" : null;

function agendaOuPergunta() {
  if (contexto.resultado_agenda?.sucesso && contexto.resultado_agenda.total_disponiveis > 0) {
    return [
      "Tenho essas opcoes para *" + contexto.resultado_data.dia_semana + ", " + contexto.resultado_data.data_informada + "*:",
      contexto.resultado_agenda.lista_numerada,
      "Qual horario voce prefere?"
    ];
  }
  if (contexto.resultado_data?.sucesso) {
    return ["Perfeito 😊 Voce prefere *manha* ou *tarde*?"];
  }
  return ["Pra eu te passar os horarios certinhos, me fala qual dia funciona melhor pra voce? 😊"];
}

if (reason === "Ofereceu horario sem agenda validada" || reason === "Confirmou agendamento sem horario validado") {
  approved = true;
  severity = "medium";
  mensagensSaida = agendaOuPergunta();
}

const fallback = {
  mensagens: [
    "Tive uma instabilidade aqui para processar sua mensagem.",
    "Vou transferir voce para um atendente da unidade para te ajudar da melhor forma. Um instante, por gentileza."
  ]
};

return [{
  json: {
    ...item,
    validador_status: {
      approved,
      reason: reason || null,
      severity,
      mensagens: approved ? mensagensSaida : fallback.mensagens,
      raw_response: parsed || { raw }
    }
  }
}];`;

const addendum = [
  '',
  'HOTFIX CONTRATO DE AGENDA EM PRODUCAO:',
  '- Se proxima_acao_obrigatoria = "oferecer_horarios_validos", responda listando somente resultado_agenda.lista_numerada e pergunte qual horario prefere.',
  '- Se proxima_acao_obrigatoria = "coletar_turno", pergunte somente se prefere manha ou tarde.',
  '- NUNCA confirme agendamento/reserva se resultado_horario.disponivel nao for true.',
  '- Depois que o nome for informado, se ja existir data + turno, NAO confirme: liste horarios validos primeiro.',
].join('\n');

if (!String(atendente.parameters.text || '').includes('HOTFIX CONTRATO DE AGENDA EM PRODUCAO')) {
  atendente.parameters.text = `${atendente.parameters.text}${addendum}`;
}

fs.writeFileSync(outputPath, JSON.stringify(wf, null, 2));
console.log(`Wrote ${outputPath}`);
