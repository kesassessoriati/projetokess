export interface LeadFieldDefinition {
  fieldKey: string;
  label: string;
  fieldType: string;
  group: string;
  sortOrder: number;
  required?: boolean;
}

export const requiredLeadFieldKeys = new Set([
  "status",
  "pipelineId",
  "stageId",
  "name",
  "phone"
]);

export const defaultLeadFields: LeadFieldDefinition[] = [
  { fieldKey: "status", label: "Status", fieldType: "select", group: "Dados basicos", sortOrder: 10, required: true },
  { fieldKey: "pipelineId", label: "Funil de Vendas", fieldType: "select", group: "Dados basicos", sortOrder: 20, required: true },
  { fieldKey: "stageId", label: "Estagio Funil", fieldType: "select", group: "Dados basicos", sortOrder: 30, required: true },
  { fieldKey: "name", label: "Nome", fieldType: "text", group: "Dados basicos", sortOrder: 40, required: true },
  { fieldKey: "companyName", label: "Empresa", fieldType: "text", group: "Dados basicos", sortOrder: 50 },
  { fieldKey: "document", label: "CPF / CNPJ", fieldType: "text", group: "Dados basicos", sortOrder: 60 },
  { fieldKey: "email", label: "E-mail", fieldType: "email", group: "Dados basicos", sortOrder: 70 },
  { fieldKey: "phone", label: "Telefone", fieldType: "text", group: "Dados basicos", sortOrder: 80, required: true },
  { fieldKey: "decisionMakerPhone", label: "Telefone decisor", fieldType: "text", group: "Dados basicos", sortOrder: 90 },
  { fieldKey: "address", label: "Endereco", fieldType: "text", group: "Dados basicos", sortOrder: 100 },
  { fieldKey: "product", label: "Produto", fieldType: "text", group: "Produto", sortOrder: 110 },
  { fieldKey: "position", label: "Cargo", fieldType: "text", group: "Informacoes comerciais", sortOrder: 120 },
  { fieldKey: "decisionMakerName", label: "Nome decisor", fieldType: "text", group: "Informacoes comerciais", sortOrder: 130 },
  { fieldKey: "birthDate", label: "Data de nascimento", fieldType: "date", group: "Informacoes comerciais", sortOrder: 140 },
  { fieldKey: "clientSince", label: "Cliente desde", fieldType: "date", group: "Informacoes comerciais", sortOrder: 150 },
  { fieldKey: "acquisitionDate", label: "Data de aquisicao", fieldType: "date", group: "Informacoes comerciais", sortOrder: 160 },
  { fieldKey: "expirationDate", label: "Data de vencimento", fieldType: "date", group: "Informacoes comerciais", sortOrder: 170 },
  { fieldKey: "paymentType", label: "Tipo de pagamento", fieldType: "text", group: "Informacoes comerciais", sortOrder: 180 },
  { fieldKey: "purchaseType", label: "Tipo de compra", fieldType: "select", group: "Informacoes comerciais", sortOrder: 190 },
  { fieldKey: "purchaseValue", label: "Valor da venda/oportunidade", fieldType: "number", group: "Informacoes comerciais", sortOrder: 200 },
  { fieldKey: "gmn", label: "GMN", fieldType: "text", group: "Presenca digital", sortOrder: 210 },
  { fieldKey: "website", label: "Site", fieldType: "text", group: "Presenca digital", sortOrder: 220 },
  { fieldKey: "instagram", label: "Instagram", fieldType: "text", group: "Presenca digital", sortOrder: 230 },
  { fieldKey: "linkedin", label: "LinkedIn", fieldType: "text", group: "Presenca digital", sortOrder: 240 },
  { fieldKey: "source", label: "Origem", fieldType: "text", group: "CRM", sortOrder: 250 },
  { fieldKey: "campaign", label: "Campanha/Tag", fieldType: "text", group: "CRM", sortOrder: 260 },
  { fieldKey: "temperature", label: "Temperatura", fieldType: "select", group: "CRM", sortOrder: 270 },
  { fieldKey: "score", label: "Score", fieldType: "number", group: "CRM", sortOrder: 280 },
  { fieldKey: "ownerUserId", label: "Atribuir a", fieldType: "select", group: "CRM", sortOrder: 290 },
  { fieldKey: "tags", label: "Tags", fieldType: "tags", group: "CRM", sortOrder: 300 },
  { fieldKey: "notes", label: "Observacoes", fieldType: "textarea", group: "CRM", sortOrder: 310 },
  { fieldKey: "sessionid", label: "Acesso ID", fieldType: "text", group: "CRM", sortOrder: 320 }
];

export const defaultLeadFieldsByKey = new Map(
  defaultLeadFields.map(field => [field.fieldKey, field])
);
