import { Request, Response } from "express";
import { AI_AGENT_TEMPLATES } from "../services/AIProviderService/AIAgentTemplates";

export const index = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json(AI_AGENT_TEMPLATES);
};
