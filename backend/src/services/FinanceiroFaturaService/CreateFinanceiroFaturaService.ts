import * as Yup from "yup";
import { Transaction } from "sequelize";

import FinanceiroFatura from "../../models/FinanceiroFatura";
import CrmClient from "../../models/CrmClient";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import { generatePaymentLink, PaymentProvider } from "../PaymentGatewayService";
import generateCheckoutToken from "./helpers/generateCheckoutToken";

export interface CreateFinanceiroFaturaRequest {
  companyId: number;
  clientId: number;
  descricao: string;
  valor: number | string;
  status?: "aberta" | "paga" | "vencida" | "cancelada";
  dataVencimento: Date | string;
  dataPagamento?: Date | string | null;
  tipoReferencia?: "servico" | "produto" | null;
  referenciaId?: number | null;
  tipoRecorrencia?: "unica" | "mensal" | "anual";
  quantidadeCiclos?: number | null;
  cicloAtual?: number;
  dataInicio?: Date | string;
  dataFim?: Date | string | null;
  ativa?: boolean;
  observacoes?: string | null;
  paymentProvider?: "asaas" | "mercadopago" | null;
  projectId?: number | null;
  transaction?: Transaction;
}

const schema = Yup.object().shape({
  companyId: Yup.number().required(),
  clientId: Yup.number().required(),
  descricao: Yup.string().required().max(255),
  valor: Yup.number().required().moreThan(0),
  status: Yup.string()
    .oneOf(["aberta", "paga", "vencida", "cancelada"])
    .default("aberta"),
  dataVencimento: Yup.date().required(),
  dataPagamento: Yup.date().nullable(),
  tipoReferencia: Yup.string().oneOf(["servico", "produto"]).nullable(),
  referenciaId: Yup.number().nullable(),
  tipoRecorrencia: Yup.string()
    .oneOf(["unica", "mensal", "anual"])
    .default("unica"),
  quantidadeCiclos: Yup.number().integer().positive().nullable(),
  cicloAtual: Yup.number().integer().min(1).default(1),
  dataInicio: Yup.date().nullable(),
  dataFim: Yup.date().nullable(),
  ativa: Yup.boolean().default(true),
  observacoes: Yup.string().nullable(),
  paymentProvider: Yup.mixed<PaymentProvider>()
    .oneOf(["asaas", "mercadopago"])
    .nullable(),
  projectId: Yup.number().nullable()
});

const CreateFinanceiroFaturaService = async (
  data: CreateFinanceiroFaturaRequest
): Promise<FinanceiroFatura> => {
  const payload = await schema.validate(data, { abortEarly: false });

  if (
    (payload.tipoReferencia && !payload.referenciaId) ||
    (!payload.tipoReferencia && payload.referenciaId)
  ) {
    throw new AppError(
      "Para vincular uma referência é necessário informar tipo_referencia e referencia_id.",
      400
    );
  }

  if (
    payload.tipoRecorrencia === "unica" &&
    (payload.quantidadeCiclos || payload.dataFim)
  ) {
    throw new AppError(
      "Faturas com recorrência 'unica' não devem possuir quantidade_ciclos ou data_fim.",
      400
    );
  }

  const client = await CrmClient.findOne({
    where: { id: payload.clientId, companyId: payload.companyId }
  });

  if (!client) {
    throw new AppError("Cliente não encontrado para esta empresa.", 404);
  }

  let record = await FinanceiroFatura.create(
    {
      ...payload,
      status: payload.status || "aberta",
      tipoRecorrencia: payload.tipoRecorrencia || "unica",
      cicloAtual: payload.cicloAtual || 1,
      ativa: payload.ativa ?? true,
      dataInicio: payload.dataInicio || new Date()
    },
    { transaction: payload.transaction }
  );

  if (payload.paymentProvider) {
    try {
      let checkoutToken = record.checkoutToken;
      if (!checkoutToken) {
        checkoutToken = await generateCheckoutToken();
      }

      const paymentData = await generatePaymentLink({
        invoice: record,
        provider: payload.paymentProvider
      });

      record = await record.update({
        paymentProvider: payload.paymentProvider,
        paymentLink: paymentData.paymentLink,
        paymentExternalId: paymentData.paymentExternalId,
        checkoutToken
      });
    } catch (error) {
      console.error("Erro ao gerar link de pagamento:", error);
    }
  }

  const io = getIO();
  io.of(String(payload.companyId)).emit(`company-${payload.companyId}-financeiro`, {
    action: "fatura:created",
    payload: record
  });

  return record;
};

export default CreateFinanceiroFaturaService;
