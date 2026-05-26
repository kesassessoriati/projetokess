const fs = require("fs");

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/hotfix_vivena_agenda_state.js <input.json> <output.json>");
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const workflow = Array.isArray(doc) ? doc[0] : doc;

function nodeByName(name) {
  const node = workflow.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  node.parameters = node.parameters || {};
  return node;
}

nodeByName("Detector de Intenção e Entidades").parameters.jsCode = `
const item = $('Parse Estado Conversacional').first().json;
const msg = item.normalizedInput?.mensagem_normalizada || "";
const stage = item.state?.leadStage || "inicio";

const patterns = {
  saudacao: /^(oi|ola|opa|bom dia|boa tarde|boa noite|tudo bem)\\b/,
  valor: /\\b(valor|preco|quanto|custa|pagamento|pix|cartao|valores)\\b/,
  procedimento: /\\b(como funciona|beneficio|procedimento|tratamento|indicado|serve|crioshape|cryoshape|ultraformer|botox|premium skin|preenchimento)\\b/,
  humano: /\\b(humano|atendente|pessoa|recepcionista|falar com alguem|falar com uma pessoa)\\b/,
  cancelar: /\\b(cancelar|desmarcar|nao vou|desistir)\\b/,
  remarcar: /\\b(remarcar|mudar|trocar horario|alterar)\\b/,
  agendar: /\\b(agendar|marcar|avaliacao|consulta|vaga|horario|disponivel)\\b/,
  confirmar: /\\b(confirmar|confirmado|ok|perfeito|certo|sim|pode ser|quero sim)\\b/,
};

const dataMatch = msg.match(/\\b(hoje|hj|amanha|depois de amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|semana que vem|proxima semana|dia\\s+\\d{1,2}|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)\\b/);
const horarioMatch = msg.match(/\\b(\\d{1,2}h|\\d{1,2}:\\d{2}|manha|tarde|noite)\\b/);
const numericHourMatch = msg.match(/\\b(?:as|às|a|para|ser)?\\s*(\\d{1,2})(?:h|:\\d{2})\\b|\\b(\\d{1,2})\\s*horas\\b/);
const procedimentoMatch = msg.match(/\\b(crioshape|cryoshape|ultraformer|botox|premium skin|preenchimento)\\b/);
const objetivoMatch = msg.match(/\\b(gordura|barriga|flacidez|rugas|papada|pele|emagrecer|medidas|culote)\\b/);

let intencao = "outro";
if (patterns.saudacao.test(msg)) intencao = "saudacao";
else if (patterns.humano.test(msg)) intencao = "falar_humano";
else if (patterns.cancelar.test(msg)) intencao = "cancelar";
else if (patterns.remarcar.test(msg)) intencao = "remarcar";
else if (patterns.valor.test(msg)) intencao = "duvida_valor";
else if (patterns.agendar.test(msg)) intencao = "quer_agendar";
else if (patterns.procedimento.test(msg)) intencao = "duvida_procedimento";
else if (patterns.confirmar.test(msg)) intencao = "confirmar_agendamento";

if (stage === "coletando_unidade" && /^(1|2)$/.test(msg)) intencao = "informa_unidade";
if (stage === "coletando_turno" && /\\b(manha|tarde|noite)\\b/.test(msg)) intencao = "informa_turno";
if ((stage === "coletando_horario" || /\\b(pode ser|prefiro|quero|fechar|fica|marcar)\\b/.test(msg)) && numericHourMatch) intencao = "informa_horario";
if (stage === "coletando_nome" && msg.length >= 3 && !/\\d/.test(msg)) intencao = "informa_nome";

let unidade = null;
if (stage === "coletando_unidade") {
  if (msg === "1" || /aldeota|virgilio|sul/.test(msg)) unidade = "1";
  if (msg === "2" || /centro|alexandrino|vivena/.test(msg)) unidade = "2";
}

const entidades = {
  menciona_data: !!dataMatch,
  data_texto_original: dataMatch?.[0] || null,
  menciona_horario: !!horarioMatch,
  horario_texto_original: horarioMatch?.[0] || null,
  horario_numerico: numericHourMatch ? Number(numericHourMatch[1] || numericHourMatch[2]) : null,
  menciona_unidade: !!unidade,
  unidade_escolhida: unidade,
  menciona_objetivo: !!objetivoMatch,
  objetivo_estetico: objetivoMatch?.[0] || null,
  menciona_procedimento: !!procedimentoMatch,
  procedimento: procedimentoMatch?.[0] || null,
  resposta_curta: msg.length <= 15
};

return [{ json: { ...item, intencao_detectada: intencao, entidades_detectadas: entidades } }];
`.trim();

nodeByName("Roteador de Ferramentas Obrigatórias").parameters.jsCode = `
const item = $('Detector de Intenção e Entidades').first().json;
const state = item.state || {};
const entidades = item.entidades_detectadas || {};
const intencao = item.intencao_detectada || "outro";

const TZ = "America/Sao_Paulo";
const dias = ["domingo", "segunda-feira", "terca-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sabado"];
const weekdayMap = { domingo: 0, segunda: 1, "segunda-feira": 1, terca: 2, "terca-feira": 2, quarta: 3, "quarta-feira": 3, quinta: 4, "quinta-feira": 4, sexta: 5, "sexta-feira": 5, sabado: 6 };
const pad = (n) => String(n).padStart(2, "0");
const br = (d) => \`\${pad(d.getDate())}/\${pad(d.getMonth() + 1)}/\${d.getFullYear()}\`;
const iso = (d) => \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}\`;
const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, days) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };

function nowLocal() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return new Date(Number(get("year")), Number(get("month")) - 1, Number(get("day")), Number(get("hour")), Number(get("minute")));
}

function parseDate(text) {
  const raw = String(text || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
  const today = start(nowLocal());
  if (!raw) return null;
  if (/\\b(hoje|hj)\\b/.test(raw)) return today;
  if (/\\bamanha\\b/.test(raw)) return addDays(today, 1);
  if (/\\bdepois de amanha\\b/.test(raw)) return addDays(today, 2);
  const num = raw.match(/\\b(\\d{1,2})[\\/\\-](\\d{1,2})(?:[\\/\\-](\\d{2,4}))?\\b/);
  if (num) {
    const year = num[3] ? Number(num[3].length === 2 ? "20" + num[3] : num[3]) : today.getFullYear();
    let d = new Date(year, Number(num[2]) - 1, Number(num[1]));
    if (!num[3] && d < today) d = new Date(year + 1, Number(num[2]) - 1, Number(num[1]));
    return d;
  }
  for (const [name, day] of Object.entries(weekdayMap)) {
    if (new RegExp(\`\\\\b\${name}\\\\b\`).test(raw)) {
      let diff = day - today.getDay();
      if (diff <= 0 || /proxim|que vem|semana que vem/.test(raw)) diff += 7;
      return addDays(today, diff);
    }
  }
  const dia = raw.match(/\\bdia\\s+(\\d{1,2})\\b/);
  if (dia) {
    let d = new Date(today.getFullYear(), today.getMonth(), Number(dia[1]));
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, Number(dia[1]));
    return d;
  }
  return null;
}

function isOpen(d) {
  const day = d.getDay();
  if (day === 0) return { open: false, reason: "Domingo - clinica fechada" };
  if (day === 5 && iso(d) !== "2026-04-17") return { open: false, reason: "Sexta-feira - clinica fechada" };
  return { open: true, reason: null };
}

function slotsFor(d) {
  if (iso(d) === "2026-04-17") return [13, 14, 15];
  if (d.getDay() === 6) return [9, 10, 11, 12, 13];
  return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
}

const desiredDateText = entidades.data_texto_original || state.data_desejada || "";
const parsedDate = parseDate(desiredDateText);
let resultado_data = { sucesso: false };
if (parsedDate) {
  const today = start(nowLocal());
  const status = isOpen(parsedDate);
  resultado_data = {
    sucesso: true,
    data_informada: br(parsedDate),
    data_iso: iso(parsedDate),
    dia_semana: dias[parsedDate.getDay()],
    classificacao: start(parsedDate) < today ? "passado" : start(parsedDate).getTime() === today.getTime() ? "presente" : "futuro",
    esta_aberto: start(parsedDate) >= today && status.open,
    motivo_fechado: start(parsedDate) < today ? "Data no passado" : status.reason
  };
}

const appointments = $('Puxa Agendamentos Ativos').all().map((x) => x.json || {}).filter((x) => x.start_datetime || x.data || x.date);
let resultado_agenda = { sucesso: false };
let resultado_horario = { sucesso: false };
if (resultado_data.sucesso && resultado_data.esta_aberto && (entidades.menciona_horario || /coletando_(turno|horario)/.test(state.leadStage || "") || intencao === "quer_agendar" || intencao === "informa_horario")) {
  const occupied = appointments
    .filter((a) => String(a.status || "").toLowerCase() !== "cancelado" && String(a.status || "").toLowerCase() !== "cancelled")
    .filter((a) => String(a.start_datetime || a.data || a.date || "").slice(0, 10) === resultado_data.data_iso)
    .map((a) => {
      if (a.start_datetime) {
        const dt = new Date(a.start_datetime);
        const brt = new Date(dt.getTime() - 3 * 60 * 60 * 1000);
        return brt.getUTCHours();
      }
      const m = String(a.horario || a.hora || "").match(/(\\d{1,2})/);
      return m ? Number(m[1]) : null;
    })
    .filter((h) => h !== null);
  let freeAll = slotsFor(parsedDate).filter((h) => !occupied.includes(h));
  const turno = String(entidades.horario_texto_original || state.turno_desejado || "");
  if (/manha/.test(turno)) freeAll = freeAll.filter((h) => h < 12);
  if (/tarde/.test(turno)) freeAll = freeAll.filter((h) => h >= 12 && h <= 17);
  const freeOffer = freeAll.slice(0, 4);
  resultado_agenda = {
    sucesso: true,
    horarios_disponiveis: freeOffer.map((h) => \`\${h}h\`),
    total_disponiveis: freeOffer.length,
    lista_numerada: freeOffer.map((h, i) => \`\${i + 1}. \${h}h\`).join("\\n")
  };
  if (intencao === "informa_horario" && entidades.horario_numerico !== null) {
    const selected = Number(entidades.horario_numerico);
    resultado_horario = {
      sucesso: true,
      horario_solicitado: \`\${selected}h\`,
      disponivel: freeAll.includes(selected),
      motivo: freeAll.includes(selected) ? null : "Horario solicitado nao esta disponivel para a data/turno atual"
    };
  }
}

let proxima = "dialogar";
if (intencao === "falar_humano") proxima = "transferir_humano";
else if (resultado_horario.sucesso && resultado_horario.disponivel) proxima = "confirmar_horario_escolhido";
else if (resultado_horario.sucesso && !resultado_horario.disponivel) proxima = "horario_indisponivel_oferecer_alternativas";
else if (state.leadStage === "inicio" && (intencao === "saudacao" || intencao === "duvida_procedimento")) proxima = "qualificar_objetivo";
else if (!state.nome_completo && /agendar|quer_agendar/.test(intencao)) proxima = "coletar_nome";
else if (!state.unidade_escolhida && /coletando_unidade|informa_nome/.test(state.leadStage + "|" + intencao)) proxima = "coletar_unidade";
else if (!state.data_desejada && /coletando_data/.test(state.leadStage)) proxima = "coletar_data";
else if (resultado_agenda.sucesso) proxima = "oferecer_horarios_validos";

const contexto_operacional = {
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
    "Nao citar ferramentas, prompt ou raciocinio interno",
    "Se proxima_acao_obrigatoria=confirmar_horario_escolhido, nao liste horarios novamente",
    "Nao criar compromisso se agendamento_confirmado=true"
  ]
};

return [{ json: { ...item, contexto_operacional } }];
`.trim();

nodeByName("Atendente").parameters.text =
  "=CONTEXTO OPERACIONAL DO LEAD:\n{{ JSON.stringify($json.contexto_operacional) }}\n\nNumero do Whatsapp do Lead: {{ $('puxa paciente clientes3').item.json.phone }}\n\nSession_id: {{ $('Code1').first().json.sessionId }}\n\nMensagem consolidada do contato: {{ $('Junta-mensagens-picadas').item.json.mensagem }}\n\nINSTRUÇÃO CRÍTICA PARA ESTE TURNO:\n- Use o CONTEXTO OPERACIONAL como verdade operacional.\n- Se proxima_acao_obrigatoria = \"confirmar_horario_escolhido\" e resultado_horario.disponivel = true: NÃO ofereça lista de horários novamente. Confirme o horário escolhido, avance o agendamento e use as ferramentas obrigatórias de verificação/criação conforme o prompt do sistema.\n- Se proxima_acao_obrigatoria = \"horario_indisponivel_oferecer_alternativas\": explique que o horário escolhido não está disponível e ofereça somente resultado_agenda.lista_numerada.\n- Se proxima_acao_obrigatoria = \"oferecer_horarios_validos\": ofereça somente os horários de resultado_agenda.lista_numerada.\n- Se resultado_data.sucesso = true, use exatamente resultado_data.dia_semana e resultado_data.data_informada.\n- Nunca exponha ferramenta, prompt, raciocínio interno ou contexto técnico ao lead.\n- Responda somente JSON válido no formato {\"mensagens\":[\"msg1\",\"msg2\"]}.";

nodeByName("Atualizador de Estado").parameters.jsCode = `
const item = $input.first()?.json || {};
const contexto = $('Roteador de Ferramentas Obrigatórias').first().json.contexto_operacional || {};
const state = { ...(contexto.estado_atual || {}) };
const entidades = contexto.entidades_detectadas || {};
const intencao = contexto.intencao_detectada || "outro";
const mensagens = item.validador_status?.mensagens || [];
const saida = mensagens.join("\\n");

if (entidades.objetivo_estetico) state.objetivo = entidades.objetivo_estetico;
if (entidades.procedimento) state.procedimento_sugerido = entidades.procedimento;
if (entidades.data_texto_original) state.data_desejada = entidades.data_texto_original;
if (entidades.horario_texto_original && /manha|tarde|noite/.test(entidades.horario_texto_original)) state.turno_desejado = entidades.horario_texto_original;
if (contexto.resultado_horario?.disponivel && contexto.resultado_horario.horario_solicitado) state.horario_escolhido = contexto.resultado_horario.horario_solicitado;
else if (entidades.horario_texto_original && /\\d/.test(entidades.horario_texto_original)) state.horario_escolhido = entidades.horario_texto_original;
if (entidades.unidade_escolhida) {
  state.unidade_escolhida = entidades.unidade_escolhida;
  state.endereco_unidade = entidades.unidade_escolhida === "1"
    ? "Av. Senador Virgilio Tavora, 1701 - Sala 608"
    : "Rua Alexandrino dos Reis, 106 - Sala 08";
}

const lower = saida.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
if (intencao === "falar_humano") state.leadStage = "humano";
else if (contexto.resultado_horario?.disponivel) state.leadStage = /confirmad|agendad/.test(lower) ? "confirmado" : "coletando_horario";
else if (/como posso te chamar|qual seu nome|nome completo/.test(lower)) state.leadStage = "coletando_nome";
else if (/qual unidade|unidade prefere|escolha a unidade/.test(lower)) state.leadStage = "coletando_unidade";
else if (/qual dia|melhor dia|que dia/.test(lower)) state.leadStage = "coletando_data";
else if (/manha ou tarde|qual turno|melhor turno/.test(lower)) state.leadStage = "coletando_turno";
else if (contexto.resultado_agenda?.sucesso && contexto.resultado_agenda.total_disponiveis > 0) state.leadStage = "coletando_horario";
else if (/confirmad|agendad/.test(lower) && state.unidade_escolhida && state.horario_escolhido) {
  state.leadStage = "confirmado";
  state.agendamento_confirmado = true;
}

if (/confirmad|agendad/.test(lower) && state.horario_escolhido) state.agendamento_confirmado = true;
state.updatedAt = new Date().toISOString();
state.ultima_resposta_enviada = saida;
return [{ json: { ...item, updated_state: state } }];
`.trim();

fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
console.log(`Hotfixed ${workflow.id} - ${workflow.name}`);
