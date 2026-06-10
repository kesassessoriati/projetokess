import { Request, Response } from "express";
import { generateCampaignVariations } from "../services/CampaignService/GenerateVariationsService";
import { getCreditInfo } from "../services/AiCreditService/AiCreditService";
import AppError from "../errors/AppError";

export const generateVariations = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { baseMessage, quantity = 5 } = req.body;

  if (!baseMessage || typeof baseMessage !== "string" || baseMessage.trim().length === 0) {
    throw new AppError("Mensagem base é obrigatória.", 400);
  }

  if (baseMessage.trim().length < 5) {
    throw new AppError("Mensagem base muito curta. Escreva pelo menos 5 caracteres.", 400);
  }

  const safeQuantity = Math.min(Math.max(1, Number(quantity) || 5), 5);

  const creditInfo = await getCreditInfo(companyId);
  if (!creditInfo.hasCredits) {
    return res.status(402).json({
      error: "NO_CREDITS",
      message: "Saldo de créditos de IA insuficiente. Adicione créditos ou desative a personalização com IA.",
      creditInfo
    });
  }

  const messages = await generateCampaignVariations(
    baseMessage.trim(),
    safeQuantity,
    companyId
  );

  const updatedCreditInfo = await getCreditInfo(companyId);

  return res.json({
    messages,
    creditsConsumed: 1,
    creditInfo: updatedCreditInfo
  });
};

export const getCreditStatus = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const creditInfo = await getCreditInfo(companyId);
  return res.json({ creditInfo });
};
