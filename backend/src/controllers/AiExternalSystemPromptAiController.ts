import { Request, Response } from "express";
import {
  analyzeSystemPrompt,
  improveSystemPrompt,
  examplesFromChatMemory,
  PROMPT_TEMPLATES
} from "../services/AiExternalAgentServices/SystemPromptAiService";

export const templates = async (_req: Request, res: Response): Promise<Response> => {
  return res.json({ ok: true, templates: PROMPT_TEMPLATES });
};

export const analyze = async (req: Request, res: Response): Promise<Response> => {
  try {
    const companyId = (req as any).user?.companyId;
    if (!companyId) return res.status(401).json({ ok: false, error: "ERR_UNAUTHORIZED" });

    const { prompt } = req.body as { prompt?: string };
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
      return res.status(400).json({ ok: false, error: "prompt_required" });
    }

    const result = await analyzeSystemPrompt(companyId, prompt);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err?.message === "global_ai_provider_not_configured") {
      return res.status(422).json({ ok: false, error: "global_ai_provider_not_configured" });
    }
    return res.status(500).json({ ok: false, error: "analyze_error", message: err?.message });
  }
};

export const improve = async (req: Request, res: Response): Promise<Response> => {
  try {
    const companyId = (req as any).user?.companyId;
    if (!companyId) return res.status(401).json({ ok: false, error: "ERR_UNAUTHORIZED" });

    const { prompt, mode } = req.body as { prompt?: string; mode?: string };
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
      return res.status(400).json({ ok: false, error: "prompt_required" });
    }

    const validModes = ["commercial", "support", "scheduling", "general"];
    const safeMode = validModes.includes(mode as string)
      ? (mode as "commercial" | "support" | "scheduling" | "general")
      : "general";

    const result = await improveSystemPrompt(companyId, prompt, safeMode);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err?.message === "global_ai_provider_not_configured") {
      return res.status(422).json({ ok: false, error: "global_ai_provider_not_configured" });
    }
    return res.status(500).json({ ok: false, error: "improve_error", message: err?.message });
  }
};

export const examplesFromMemory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const companyId = (req as any).user?.companyId;
    if (!companyId) return res.status(401).json({ ok: false, error: "ERR_UNAUTHORIZED" });

    const limit = Math.min(Number(req.body?.limit) || 20, 50);
    const validFocus = ["objections", "scheduling", "pricing", "general"];
    const focus = validFocus.includes(req.body?.focus) ? req.body.focus : "general";

    const result = await examplesFromChatMemory(companyId, limit, focus);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err?.message === "global_ai_provider_not_configured") {
      return res.status(422).json({ ok: false, error: "global_ai_provider_not_configured" });
    }
    return res.status(500).json({ ok: false, error: "examples_error", message: err?.message });
  }
};
