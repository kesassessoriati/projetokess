const fs = require('fs');

const inputPath = 'tmp/n8n_trairi/trairi-workflow-patched.json';
const outputPath = 'tmp/n8n_trairi/trairi-workflow-hotfix-validator.json';

const wf = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function byPrefix(prefix) {
  const node = wf.nodes.find((n) => n.name.startsWith(prefix));
  if (!node) throw new Error(`Node not found by prefix: ${prefix}`);
  return node;
}

function byName(name) {
  const node = wf.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  return node;
}

const validador = byPrefix('Validador Cr');
const atualizador = byName('Atualizador de Estado');
const atendente = byName('Atendente');

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
    try {
      parsed = JSON.parse(m[0]);
    } catch (_) {}
  }
}

if (!parsed) {
  reason = "JSON invalido";
} else if (!Array.isArray(parsed.mensagens)) {
  reason = "Resposta sem chave mensagens em array";
} else if (!parsed.mensagens.length) {
  reason = "Lista mensagens vazia";
} else if (parsed.mensagens.length > 5) {
  reason = "Mais de 5 mensagens";
}

const mensagens = (parsed?.mensagens || []).map((m) => String(m).trim()).filter(Boolean);
const joined = mensagens.join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

if (!reason && /(consultar_dia_semana_code|consultar_agenda|criar_compromisso|verificar_agendamento_lead|tool_call|system prompt|raciocinio interno)/i.test(joined)) {
  reason = "Vazamento de ferramenta ou prompt";
}

if (!reason && /\b(cpf|rg|data de nascimento|nascimento|idade|endereco|email|e-mail)\b/i.test(joined)) {
  reason = "Pedido de dado pessoal proibido";
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

// Erro recuperavel: o agente tentou oferecer horario sem uma agenda calculada
// pelo Roteador. Nao transfere para humano; corrige a conversa pedindo o dado
// operacional que falta.
if (reason === "Ofereceu horario sem agenda validada") {
  approved = true;
  severity = "medium";

  if (!contexto.resultado_data?.sucesso) {
    mensagensSaida = [
      "Pra eu te passar os horarios certinhos, me fala qual dia funciona melhor pra voce? 😊"
    ];
  } else {
    mensagensSaida = [
      "Perfeito 😊 Voce prefere *manha* ou *tarde*?"
    ];
  }
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

atualizador.parameters.jsCode = String.raw`const item = $input.first()?.json || {};
const contexto = $('Roteador de Ferramentas Obrigatórias').first().json.contexto_operacional || {};
const state = { ...(contexto.estado_atual || {}) };
const entidades = contexto.entidades_detectadas || {};
const intencao = contexto.intencao_detectada || "outro";
const mensagens = item.validador_status?.mensagens || [];
const saida = mensagens.join("\n");
const ultimaMensagem = String(state.lastUserMessage || "").trim();

if (intencao === "informa_nome" && !state.nome_completo && ultimaMensagem) {
  state.nome_completo = ultimaMensagem;
}

if (entidades.procedimento) state.procedimento_sugerido = entidades.procedimento;
if (entidades.data_texto_original) state.data_desejada = entidades.data_texto_original;
if (entidades.horario_texto_original && /manha|tarde/.test(entidades.horario_texto_original)) state.turno_desejado = entidades.horario_texto_original;
if (contexto.resultado_horario?.disponivel && contexto.resultado_horario.horario_solicitado) state.horario_escolhido = contexto.resultado_horario.horario_solicitado;

const lower = saida.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

if (intencao === "falar_humano") {
  state.leadStage = "humano";
} else if (contexto.resultado_horario?.disponivel) {
  state.leadStage = /confirmad|agendad/.test(lower) ? "confirmado" : "coletando_horario";
} else if (/nome e sobrenome|nome completo|como posso te chamar/.test(lower)) {
  state.leadStage = "coletando_nome";
} else if (/qual dia|melhor dia|que dia|me fala qual dia/.test(lower)) {
  state.leadStage = "coletando_data";
} else if (/manha ou tarde|qual turno|melhor turno|voce prefere \*?manha\*? ou \*?tarde\*?/.test(lower)) {
  state.leadStage = "coletando_turno";
} else if (contexto.resultado_agenda?.sucesso && contexto.resultado_agenda.total_disponiveis > 0) {
  state.leadStage = "coletando_horario";
} else if (/confirmad|agendad/.test(lower) && state.horario_escolhido) {
  state.leadStage = "confirmado";
  state.agendamento_confirmado = true;
}

if (/confirmad|agendad/.test(lower) && state.horario_escolhido) state.agendamento_confirmado = true;

state.updatedAt = new Date().toISOString();
state.ultima_resposta_enviada = saida;

return [{ json: { ...item, updated_state: state } }];`;

const guardrail = [
  '',
  'HOTFIX VALIDACAO DE AGENDA:',
  '- Se resultado_data.sucesso nao for true, NUNCA cite data, dia da semana ou horarios. Pergunte qual dia funciona melhor.',
  '- Se resultado_agenda.sucesso nao for true e resultado_horario.sucesso nao for true, NUNCA ofereca horarios.',
  '- Se o lead perguntar "quais disponiveis?", isso nao autoriza inventar agenda. Primeiro obtenha dia e turno; depois use os horarios do resultado_agenda.',
].join('\n');

if (!String(atendente.parameters.text || '').includes('HOTFIX VALIDACAO DE AGENDA')) {
  atendente.parameters.text = `${atendente.parameters.text}${guardrail}`;
}

fs.writeFileSync(outputPath, JSON.stringify(wf, null, 2));
console.log(`Wrote ${outputPath}`);
