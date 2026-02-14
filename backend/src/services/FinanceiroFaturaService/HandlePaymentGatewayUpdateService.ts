import FinanceiroFatura from "../../models/FinanceiroFatura";
import { PaymentProvider } from "../PaymentGatewayService";
import { getIO } from "../../libs/socket";

interface HandlePaymentGatewayUpdateParams {
  provider: PaymentProvider;
  invoiceId?: number | string | null;
  paymentExternalId?: string | number | null;
  status?: string;
  paidAmount?: number | string | null;
  paymentDate?: Date | string | null;
}

const statusMap: Record<
  PaymentProvider,
  Record<string, "aberta" | "paga" | "vencida" | "cancelada">
> = {
  mercadopago: {
    approved: "paga",
    authorized: "paga",
    in_process: "aberta",
    pending: "aberta",
    in_mediation: "aberta",
    rejected: "cancelada",
    cancelled: "cancelada",
    refunded: "cancelada",
    charged_back: "cancelada"
  },
  asaas: {
    pending: "aberta",
    awaiting: "aberta",
    received: "paga",
    confirmed: "paga",
    received_in_cash: "paga",
    overdue: "vencida",
    expired: "vencida",
    cancelled: "cancelada",
    refunded: "cancelada",
    chargeback_requested: "cancelada",
    chargeback_dispute: "cancelada",
    payment_pending: "aberta",
    payment_awaiting: "aberta",
    payment_overdue: "vencida",
    payment_expired: "vencida",
    payment_cancelled: "cancelada",
    payment_deleted: "cancelada",
    payment_refunded: "cancelada",
    payment_chargeback_requested: "cancelada",
    payment_chargeback_dispute: "cancelada",
    payment_confirmed: "paga",
    payment_received: "paga",
    payment_received_in_cash: "paga"
  }
};

const normalizeStatus = (provider: PaymentProvider, status?: string) => {
  if (!status) {
    return undefined;
  }

  const normalized = status.toLowerCase();
  return statusMap[provider]?.[normalized];
};

const HandlePaymentGatewayUpdateService = async ({
  provider,
  invoiceId,
  paymentExternalId,
  status,
  paidAmount,
  paymentDate
}: HandlePaymentGatewayUpdateParams): Promise<FinanceiroFatura | null> => {
  const where: Record<string, any> = {};

  if (invoiceId) {
    where.id = Number(invoiceId);
  }

  if (!where.id && paymentExternalId) {
    where.paymentExternalId = String(paymentExternalId);
  } else if (paymentExternalId) {
    where.paymentExternalId = String(paymentExternalId);
  }

  if (!where.id && !where.paymentExternalId) {
    return null;
  }

  const fatura = await FinanceiroFatura.findOne({ where });

  if (!fatura) {
    return null;
  }

  const updates: Record<string, any> = {};
  const mappedStatus = normalizeStatus(provider, status);

  if (paymentExternalId) {
    updates.paymentExternalId = String(paymentExternalId);
  }

  if (typeof paidAmount !== "undefined" && paidAmount !== null) {
    const amount = Number(paidAmount);
    if (!Number.isNaN(amount)) {
      updates.valorPago = amount.toFixed(2);
    }
  }

  if (mappedStatus) {
    updates.status = mappedStatus;
    if (mappedStatus === "paga") {
      updates.dataPagamento = paymentDate
        ? new Date(paymentDate)
        : new Date();
      if (typeof updates.valorPago === "undefined") {
        updates.valorPago = Number(fatura.valor || 0).toFixed(2);
      }
    } else {
      updates.dataPagamento = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return fatura;
  }

  await fatura.update(updates);
  await fatura.reload();

  const io = getIO();
  io.of(String(fatura.companyId)).emit(`company-${fatura.companyId}-financeiro`, {
    action: "fatura:updated",
    payload: fatura
  });

  return fatura;
};

export default HandlePaymentGatewayUpdateService;
