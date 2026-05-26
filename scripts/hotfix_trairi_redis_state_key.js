const fs = require('fs');

const inputPath = 'tmp/n8n_trairi/trairi-debug-current-host.json';
const outputPath = 'tmp/n8n_trairi/trairi-workflow-hotfix-redis-key.json';

let wf = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (Array.isArray(wf)) wf = wf[0];

const persist = wf.nodes.find((n) => n.name === 'Persistir Estado Redis');
if (!persist) throw new Error('Persistir Estado Redis not found');

persist.parameters.key =
  '=IA_trairi:{{ $(\'Normalizar Entrada Inteligente\').first().json.normalizedInput.companyId }}:{{ $(\'Normalizar Entrada Inteligente\').first().json.normalizedInput.contactId }}:{{ $(\'Normalizar Entrada Inteligente\').first().json.normalizedInput.whatsappId }}:state';

const atualizador = wf.nodes.find((n) => n.name === 'Atualizador de Estado');
if (!atualizador) throw new Error('Atualizador de Estado not found');

if (!atualizador.parameters.jsCode.includes("normalizedInput: $('Normalizar Entrada Inteligente')")) {
  atualizador.parameters.jsCode = atualizador.parameters.jsCode.replace(
    'return [{ json: { ...item, updated_state: state } }];',
    "return [{ json: { ...item, normalizedInput: $('Normalizar Entrada Inteligente').first().json.normalizedInput, updated_state: state } }];"
  );
}

fs.writeFileSync(outputPath, JSON.stringify(wf, null, 2));
console.log(`Wrote ${outputPath}`);
