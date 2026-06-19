import { Request, Response } from "express";
import * as Yup from "yup";

import RunTicketCopilotService, {
  TicketCopilotAction
} from "../services/TicketCopilot/RunTicketCopilotService";
import { getUserWithQueues } from "../services/TicketCopilot/BuildTicketCopilotContextService";
import AppError from "../errors/AppError";

const schema = Yup.object().shape({
  action: Yup.string()
    .oneOf(["summarize", "suggest_reply", "rewrite"])
    .required(),
  message: Yup.string().max(1000).nullable(),
  draft: Yup.string().max(4000).nullable()
});

export const run = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId, id: userId } = req.user;

  const payload = await schema.validate(req.body || {}, {
    stripUnknown: true
  });

  const user = await getUserWithQueues(userId);
  if (Number(user.companyId) !== Number(companyId)) {
    throw new AppError("Usuario sem acesso a esta empresa.", 403);
  }

  const response = await RunTicketCopilotService({
    ticketId,
    companyId,
    user,
    action: payload.action as TicketCopilotAction,
    message: payload.message || "",
    draft: payload.draft || ""
  });

  return res.status(200).json(response);
};
