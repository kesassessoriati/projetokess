import { Request, Response } from "express";
import CreateWebHookService from "../services/WebhookService/CreateWebHookService";
import DeleteWebHookService from "../services/WebhookService/DeleteWebHookService";
import UpdateWebHookService from "../services/WebhookService/UpdateWebHookService";
import GetWebHookService from "../services/WebhookService/GetWebHookService";
import DispatchWebHookService from "../services/WebhookService/DispatchWebHookService";
import ListFlowBuilderService from "../services/FlowBuilderService/ListFlowBuilderService";
import CreateFlowBuilderService from "../services/FlowBuilderService/CreateFlowBuilderService";
import UpdateFlowBuilderService from "../services/FlowBuilderService/UpdateFlowBuilderService";
import DeleteFlowBuilderService from "../services/FlowBuilderService/DeleteFlowBuilderService";
import GetFlowBuilderService from "../services/FlowBuilderService/GetFlowBuilderService";
import FlowUpdateDataService from "../services/FlowBuilderService/FlowUpdateDataService";
import FlowsGetDataService from "../services/FlowBuilderService/FlowsGetDataService";
import UploadImgFlowBuilderService from "../services/FlowBuilderService/UploadImgFlowBuilderService";
import UploadAudioFlowBuilderService from "../services/FlowBuilderService/UploadAudioFlowBuilderService";
import DuplicateFlowBuilderService from "../services/FlowBuilderService/DuplicateFlowBuilderService";
import UploadAllFlowBuilderService from "../services/FlowBuilderService/UploadAllFlowBuilderService";
import ExportFlowBuilderService from "../services/FlowBuilderService/ExportFlowBuilderService";
import ImportFlowBuilderService from "../services/FlowBuilderService/ImportFlowBuilderService";
import fs from "fs";
import TestFlowBuilderService from "../services/FlowBuilderService/TestFlowBuilderService";
import TriggerFlowWebhookService from "../services/FlowBuilderService/TriggerFlowWebhookService";
import ListFlowExecutionsService from "../services/FlowBuilderService/ListFlowExecutionsService";
import { executeFlowByToken } from "../services/FlowBuilderService/FlowTriggerDispatchService";
import { FlowBuilderModel } from "../models/FlowBuilder";
// import { handleMessage } from "../services/FacebookServices/facebookMessageListener";

export const createFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name } = req.body;
  const userId = parseInt(req.user.id);
  const { companyId } = req.user;

  const flow = await CreateFlowBuilderService({
    userId,
    name,
    companyId
  });

  if (flow === "exist") {
    return res.status(402).json("exist");
  }

  return res.status(200).json(flow);
};

export const updateFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { flowId, name } = req.body;

  const flow = await UpdateFlowBuilderService({ companyId, name, flowId });

  if(flow === 'exist'){
    return res.status(402).json('exist')
  }

  return res.status(200).json(flow);
};

export const deleteFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;

  const flowIdInt = parseInt(idFlow);

  const flow = await DeleteFlowBuilderService(flowIdInt);

  return res.status(200).json(flow);
};

export const myFlows = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const flows = await ListFlowBuilderService({
    companyId
  });

  return res.status(200).json(flows);
};

export const flowOne = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;

  const { companyId } = req.user;

  const idFlowInt = parseInt(idFlow);

  const webhook = await GetFlowBuilderService({
    companyId,
    idFlow: idFlowInt
  });

  return res.status(200).json(webhook);
};

export const FlowDataUpdate = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = parseInt(req.user.id);

  const bodyData = req.body;

  const { companyId } = req.user;

  const keys = Object.keys(bodyData);

  console.log(keys);

  const webhook = await FlowUpdateDataService({
    companyId,
    bodyData
  });

  return res.status(200).json(webhook);
};

export const FlowDataGetOne = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;

  const { companyId } = req.user;

  const idFlowInt = parseInt(idFlow);

  const webhook = await FlowsGetDataService({
    companyId,
    idFlow: idFlowInt
  });

  return res.status(200).json(webhook);
};

export const FlowUploadImg = async (req: Request, res: Response) => {
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;
  const userId = parseInt(req.user.id);

  if (medias.length === 0) {
    return res.status(400).json("No File");
  }

  let nameFile = medias[0].filename;

  if (medias[0].filename.split(".").length === 1) {
    nameFile = medias[0].filename + "." + medias[0].mimetype.split("/")[1];
  }

  const img = await UploadImgFlowBuilderService({
    userId,
    name: nameFile,
    companyId
  });
  return res.status(200).json(img);
};

export const FlowUploadAudio = async (req: Request, res: Response) => {
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;
  const userId = parseInt(req.user.id);

  if (medias.length === 0) {
    return res.status(400).json("No File");
  }

  let nameFile = medias[0].filename;

  if (medias[0].filename.split(".").length === 1) {
    nameFile = medias[0].filename + "." + medias[0].mimetype.split("/")[1];
  }

  const img = await UploadAudioFlowBuilderService({
    userId,
    name: nameFile,
    companyId
  });
  return res.status(200).json(img);
};

export const FlowDuplicate = async (req: Request, res: Response) => {
  const { flowId } = req.body;

  const newFlow = await DuplicateFlowBuilderService({ id: flowId });

  return res.status(200).json(newFlow);
};


export const FlowUploadAll = async (req: Request, res: Response) => {
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;
  const userId = parseInt(req.user.id);

  if (medias.length === 0) {
    return res.status(400).json("No File");
  }

  const items = await UploadAllFlowBuilderService({
    userId,
    medias: medias,
    companyId
  });
  return res.status(200).json(items);
};

export const exportFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;
  const { companyId } = req.user;

  const idFlowInt = parseInt(idFlow);

  try {
    const exportData = await ExportFlowBuilderService({
      companyId,
      idFlow: idFlowInt
    });

    // Definir um nome de arquivo para o download
    const flowName = exportData.name.replace(/\s+/g, "_").toLowerCase();
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${flowName}_export.json`
    );
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json(exportData);
  } catch (error) {
    console.error("Erro ao exportar fluxo:", error);
    return res.status(500).json({ error: "Erro ao exportar fluxo" });
  }
};

export const importFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = parseInt(req.user.id);
  const { companyId } = req.user;
  const importFile = req.file;

  if (!importFile) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  try {
    console.log(
      `Processando arquivo de importação: ${importFile.originalname}`
    );
    // Ler o arquivo do disco usando o path
    const fileContent = fs.readFileSync(importFile.path, "utf8");

    // Remover o arquivo temporário após leitura (opcional, mas recomendado)
    fs.unlinkSync(importFile.path);

    let importData;
    try {
      importData = JSON.parse(fileContent);
      console.log(
        `Dados de importação JSON parseados com sucesso. Nome do fluxo: ${importData.name}`
      );
    } catch (parseError) {
      console.error("Erro ao fazer parse do arquivo JSON:", parseError);
      return res.status(400).json({ error: "Arquivo JSON inválido" });
    }

    if (!importData || !importData.name || !importData.flow) {
      console.error("Formato de dados inválido:", {
        hasName: !!importData?.name,
        hasFlow: !!importData?.flow
      });
      return res.status(400).json({ error: "Formato de dados inválido" });
    }

    const newFlow = await ImportFlowBuilderService({
      userId,
      companyId,
      importData
    });

    return res.status(200).json(newFlow);
  } catch (error) {
    console.error("Erro ao importar fluxo:", error);
    return res
      .status(500)
      .json({ error: "Erro ao processar arquivo de importação" });
  }
};

export const testFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { idFlow } = req.params;
    const { message, contactNumber, contactName } = req.body;
    const { companyId } = req.user;

    // Validar idFlow
    if (!idFlow || isNaN(parseInt(idFlow))) {
      return res.status(400).json({ 
        error: "ID do fluxo inválido",
        details: "O parâmetro idFlow deve ser um número válido"
      });
    }

    console.log(`Testando fluxo ${idFlow} com mensagem: "${message}"`);

    const result = await TestFlowBuilderService({
      flowId: parseInt(idFlow),
      message,
      contactNumber,
      contactName,
      companyId
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao testar fluxo:", error);
    return res.status(500).json({ 
      error: "Erro ao testar fluxo",
      details: error.message 
    });
  }
};
export const triggerFlowWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { flowId, whatsappId, contactNumber, contactName, triggerPhrase } = req.body;

  if (!flowId || !whatsappId || !contactNumber) {
    return res.status(400).json({ error: "flowId, whatsappId e contactNumber são obrigatórios" });
  }

  try {
    const result = await TriggerFlowWebhookService({
      companyId,
      flowId: parseInt(flowId),
      whatsappId: parseInt(whatsappId),
      contactNumber: String(contactNumber),
      contactName: contactName || undefined,
      triggerPhrase: triggerPhrase || undefined
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao disparar fluxo" });
  }
};

export const toggleFlowActive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;
  const { companyId } = req.user;
  const idFlowInt = parseInt(idFlow);

  const flow = await import("../models/FlowBuilder").then(m =>
    m.FlowBuilderModel.findOne({ where: { id: idFlowInt, company_id: companyId } })
  );

  if (!flow) {
    return res.status(404).json({ error: "Fluxo não encontrado" });
  }

  await flow.update({ active: !flow.active });

  return res.status(200).json({ id: flow.id, active: flow.active });
};

export const listFlowExecutions = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { flowId, status, trigger, pageNumber } = req.query;

  const data = await ListFlowExecutionsService({
    companyId,
    flowId: flowId ? parseInt(flowId as string) : undefined,
    status: status as string,
    trigger: trigger as string,
    pageNumber: pageNumber as string
  });

  return res.status(200).json(data);
};

// Save triggers for a specific flow
export const saveTriggers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;
  const { companyId } = req.user;
  const { triggers } = req.body;

  const flow = await FlowBuilderModel.findOne({
    where: { id: parseInt(idFlow), company_id: companyId }
  });

  if (!flow) {
    return res.status(404).json({ error: "Fluxo não encontrado" });
  }

  await flow.update({ triggers: Array.isArray(triggers) ? triggers : [] });

  return res.status(200).json({ id: flow.id, triggers: flow.triggers });
};

// Public HTTP webhook trigger — no auth required
export const publicWebhookTrigger = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { token } = req.params;

  const body = req.body || {};
  const contactNumber = body.contactNumber || body.phone || body.number || "";
  const contactName = body.contactName || body.name || contactNumber;
  const whatsappId = body.whatsappId ? Number(body.whatsappId) : undefined;

  const result = await executeFlowByToken(token, {
    contactNumber,
    contactName,
    whatsappId,
    metadata: body
  });

  if (!result.success) {
    return res.status(result.error === "Token not found or flow inactive" ? 404 : 500)
      .json({ error: result.error });
  }

  return res.status(200).json({ success: true, flowId: result.flowId });
};
