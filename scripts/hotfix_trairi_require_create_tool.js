const fs = require('fs');

const inputPath = 'tmp/n8n_trairi/trairi-workflow-hotfix-agenda-contract.json';
const outputPath = 'tmp/n8n_trairi/trairi-workflow-hotfix-require-create-tool.json';

const wf = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const validador = wf.nodes.find((n) => n.name.startsWith('Validador Cr'));
const atendente = wf.nodes.find((n) => n.name === 'Atendente');
if (!validador || !atendente) throw new Error('Required nodes not found');

let code = validador.parameters.jsCode;

code = code.replace(
  'if (!reason && /\\b(confirmad|agendad|reservad)\\b/.test(joined) && !contexto.resultado_horario?.disponivel) {\n  reason = "Confirmou agendamento sem horario validado";\n}',
  String.raw`function nodeExecutou(name) {
  try {
    const data = $(name).all();
    return Array.isArray(data) && data.length > 0;
  } catch (_) {
    return false;
  }
}

const textoConfirmaAgendamento = /\b(confirmad|agendad|reservad)\b/.test(joined);
const verificouAgendamento = nodeExecutou("verificar_agendamento_lead");
const criouCompromisso = nodeExecutou("criar_compromisso") || nodeExecutou("criar_compromisso1");

if (!reason && textoConfirmaAgendamento && !contexto.resultado_horario?.disponivel) {
  reason = "Confirmou agendamento sem horario validado";
}
if (!reason && textoConfirmaAgendamento && contexto.resultado_horario?.disponivel && (!verificouAgendamento || !criouCompromisso)) {
  reason = "Confirmou agendamento sem executar ferramentas obrigatorias";
}`
);

code = code.replace(
  'if (reason === "Ofereceu horario sem agenda validada" || reason === "Confirmou agendamento sem horario validado") {',
  'if (reason === "Ofereceu horario sem agenda validada" || reason === "Confirmou agendamento sem horario validado") {'
);

// Keep missing create/verificar as hard block: it must go to fallback/human instead of
// sending a fake confirmation to the patient.
validador.parameters.jsCode = code;

const addendum = [
  '',
  'HOTFIX FERRAMENTAS OBRIGATORIAS:',
  '- Para escrever confirmado/agendado/reservado, e obrigatorio ter executado verificar_agendamento_lead e criar_compromisso na mesma resposta.',
  '- Se nao conseguiu executar essas ferramentas, nao confirme o agendamento.',
].join('\n');

if (!String(atendente.parameters.text || '').includes('HOTFIX FERRAMENTAS OBRIGATORIAS')) {
  atendente.parameters.text += addendum;
}

fs.writeFileSync(outputPath, JSON.stringify(wf, null, 2));
console.log(`Wrote ${outputPath}`);
