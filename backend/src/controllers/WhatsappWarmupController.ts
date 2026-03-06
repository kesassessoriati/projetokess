// @ts-nocheck
import { Request, Response } from "express";
import { Op, literal } from "sequelize";
import WhatsappWarmup from "../models/WhatsappWarmup";
import WhatsappWarmupLog from "../models/WhatsappWarmupLog";
import Whatsapp from "../models/Whatsapp";
import Setting from "../models/Setting";

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const warmup = await WhatsappWarmup.findOne({ where: { whatsappId, companyId } });
  return res.status(200).json(warmup);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const data = req.body;
  let warmup = await WhatsappWarmup.findOne({ where: { whatsappId, companyId } });
  if (!warmup) {
    warmup = await WhatsappWarmup.create({ ...data, whatsappId, companyId });
  } else {
    await warmup.update(data);
  }
  return res.status(200).json(warmup);
};

export const logs = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const records = await WhatsappWarmupLog.findAll({
    where: { whatsappId, companyId },
    order: [["createdAt", "DESC"]],
    limit,
  });
  return res.status(200).json(records);
};

export const summary = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsapps = await Whatsapp.findAll({
    where: { companyId },
    attributes: ["id", "name", "number", "status"],
    include: [{ model: WhatsappWarmup, as: "warmup", required: false }],
  });
  const result = whatsapps.map(w => ({
    whatsappId: w.id,
    name: w.name,
    number: w.number,
    connectionStatus: w.status,
    warmup: (w as any).warmup || null,
  }));
  return res.status(200).json(result);
};

export const stats = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const logs7days = await WhatsappWarmupLog.findAll({
    where: { whatsappId, companyId, createdAt: { [Op.gte]: sevenDaysAgo } },
    attributes: [
      [literal('DATE("createdAt")'), "date"],
      [literal("COUNT(*)"), "count"],
    ],
    group: [literal('DATE("createdAt")')],
    order: [[literal('DATE("createdAt")'), "ASC"]],
  });

  const chart: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const found = logs7days.find((l: any) => l.getDataValue("date") === dateStr);
    chart.push({ date: dateStr, count: found ? Number(found.getDataValue("count")) : 0 });
  }

  const warmup = await WhatsappWarmup.findOne({ where: { whatsappId, companyId } });
  return res.status(200).json({ chart, warmup });
};

export const generateScript = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { category = "generic", count = 15 } = req.body;

  const openAiSetting = await Setting.findOne({ where: { companyId, key: "openaiApiKey" } }).catch(() => null);
  const apiKey = openAiSetting?.value || process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey });
      const labels: Record<string, string> = {
        ecommerce: "loja virtual / e-commerce",
        services: "prestacao de servicos",
        food: "restaurante ou delivery de comida",
        health: "clinica medica ou saude",
        education: "escola ou cursos",
        realestate: "imobiliaria",
        generic: "negocio generico",
      };
      const label = labels[category] || "negocio generico";
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Voce e um especialista em aquecimento de chips WhatsApp. Gere mensagens curtas e naturais simulando clientes reais enviando mensagens para um " +
              label +
              ". Retorne SOMENTE um array JSON com as strings, sem explicacoes. Max 100 chars por mensagem. Sem emojis.",
          },
          { role: "user", content: "Gere " + count + " mensagens para " + label + "." },
        ],
        temperature: 0.9,
        max_tokens: 700,
      });
      const raw = resp.choices[0]?.message?.content || "[]";
      let scripts: string[] = [];
      try {
        scripts = JSON.parse(raw);
      } catch {
        scripts = raw.split("\n").map((l: string) => l.replace(/^[\d.\-"[\]]+/, "").trim()).filter(Boolean);
      }
      return res.status(200).json({ scripts, source: "openai" });
    } catch (err) {
      console.log("[WarmupScript] OpenAI fallback:", err && err.message);
    }
  }

  const TEMPLATES: Record<string, string[]> = {
    ecommerce: [
      "Ola, voce tem esse produto em estoque?",
      "Qual o prazo de entrega para o interior?",
      "Aceita troca de produto?",
      "Tem alguma promocao esta semana?",
      "Como funciona o frete gratis?",
      "Posso pagar parcelado no cartao?",
      "Qual a politica de devolucao?",
      "Tem versao maior desse produto?",
      "Voces enviam para todo o Brasil?",
      "Me manda o link do catalogo completo",
      "Tem garantia no produto?",
      "Aceita PIX com desconto?",
      "Quando chega o produto que pedi?",
      "Tem nota fiscal nos pedidos?",
      "Qual o tamanho disponivel?",
    ],
    services: [
      "Qual o preco do servico?",
      "Voces atendem no final de semana?",
      "Qual o horario de funcionamento?",
      "Tem orcamento gratuito?",
      "Quanto tempo demora o servico?",
      "Voces emitem nota fiscal?",
      "Tem servico de urgencia?",
      "Posso agendar para semana que vem?",
      "Qual a experiencia da equipe?",
      "Atendem na minha regiao?",
      "Tem garantia no servico?",
      "Qual a forma de pagamento?",
      "Tem fotos de servicos anteriores?",
      "Posso ver referencias de clientes?",
      "Me manda o contrato de servico",
    ],
    food: [
      "Qual o cardapio do dia?",
      "Tem opcao sem gluten?",
      "Qual o tempo de entrega?",
      "Aceita entrega pelo app?",
      "Tem prato vegetariano?",
      "Qual o horario de funcionamento?",
      "Tem mesa disponivel para jantar?",
      "Tem sobremesa sem lactose?",
      "Faz entrega em meu bairro?",
      "Tem promocao de almoco?",
      "Posso fazer pedido pelo WhatsApp?",
      "Tem porcao para criancas?",
      "Me manda o link do cardapio online",
      "Tem estacionamento?",
      "Aceita voucher de alimentacao?",
    ],
    health: [
      "Qual o valor da consulta?",
      "Tem horario disponivel esta semana?",
      "Aceita convenio?",
      "Qual o endereco da clinica?",
      "Precisa de encaminhamento medico?",
      "Faz atendimento online?",
      "Qual o tempo medio de consulta?",
      "Tem especialidade em pediatria?",
      "Posso cancelar a consulta?",
      "Emite receita digital?",
      "Tem estacionamento para pacientes?",
      "Qual o prazo para resultado do exame?",
      "Faz exame laboratorial no local?",
      "Tem atendimento de emergencia?",
      "Aceita pagamento no credito?",
    ],
    generic: [
      "Ola, tudo bem?",
      "Boa tarde, pode me ajudar?",
      "Qual o horario de atendimento?",
      "Como funciona o processo?",
      "Tem alguma novidade?",
      "Me manda mais informacoes",
      "Qual o valor aproximado?",
      "Aceita parcelamento?",
      "Voces atendem online?",
      "Tem suporte pos-venda?",
      "Qual a diferenca dos planos?",
      "Tem versao gratuita?",
      "Posso testar antes de comprar?",
      "Tem algum desconto para novo cliente?",
      "Qual o diferencial de voces?",
    ],
  };

  const scripts = TEMPLATES[category] || TEMPLATES.generic;
  return res.status(200).json({ scripts, source: "template" });
};
