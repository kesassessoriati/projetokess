import { Request, Response } from "express";
import ListCrmClientsService from "../services/CrmClientService/ListCrmClientsService";
import CreateCrmClientService from "../services/CrmClientService/CreateCrmClientService";
import ShowCrmClientService from "../services/CrmClientService/ShowCrmClientService";
import UpdateCrmClientService from "../services/CrmClientService/UpdateCrmClientService";
import DeleteCrmClientService from "../services/CrmClientService/DeleteCrmClientService";
import ImportCrmClientsService from "../services/CrmClientService/ImportCrmClientsService";
import AppError from "../errors/AppError";
import CrmClient from "../models/CrmClient";
import CrmLead from "../models/CrmLead";
import CrmClientTag from "../models/CrmClientTag";
import Tag from "../models/Tag";
import Opportunity from "../models/Opportunity";
import PipelineStage from "../models/PipelineStage";
import CreateOpportunityService from "../services/OpportunityServices/CreateOpportunityService";
import { getIO } from "../libs/socket";

export const index = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const {
    searchParam,
    status,
    type,
    product,
    clientSinceYear,
    expirationFilter,
    ownerUserId,
    pageNumber,
    limit
  } = req.query as any;

  const parsedClientSinceYear = Number(clientSinceYear);

  const result = await ListCrmClientsService({
    companyId,
    searchParam,
    status,
    type,
    product,
    expirationFilter,
    clientSinceYear:
      Number.isInteger(parsedClientSinceYear) && parsedClientSinceYear > 0
        ? parsedClientSinceYear
        : undefined,
    ownerUserId: ownerUserId ? Number(ownerUserId) : undefined,
    pageNumber: pageNumber ? Number(pageNumber) : undefined,
    limit: limit ? Number(limit) : undefined
  });

  return res.json(result);
};

export const store = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body;

  const client = await CreateCrmClientService({
    ...data,
    companyId
  });

  return res.status(201).json(client);
};

export const show = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { clientId } = req.params;

  const client = await ShowCrmClientService({
    id: Number(clientId),
    companyId
  });

  return res.json(client);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { clientId } = req.params;
  const data = req.body;

  const client = await UpdateCrmClientService({
    id: Number(clientId),
    companyId,
    ...data
  });

  return res.json(client);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { clientId } = req.params;

  if (req.user.profile !== "admin") {
    throw new AppError("Apenas administradores podem excluir clientes.", 403);
  }

  console.log("Deleting CRM client:", clientId);

  await DeleteCrmClientService({
    id: Number(clientId),
    companyId
  });

  return res.status(204).send();
};

export const bulkAssignTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { clientIds, tagIds } = req.body as { clientIds: number[]; tagIds: number[] };

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    throw new AppError("clientIds deve ser um array não vazio.");
  }
  if (!Array.isArray(tagIds)) {
    throw new AppError("tagIds deve ser um array.");
  }

  // Validate that all clients belong to this company
  const clients = await CrmClient.findAll({
    where: { id: clientIds, companyId },
    attributes: ["id"]
  });

  if (clients.length === 0) {
    throw new AppError("Nenhum cliente encontrado.");
  }

  // Validate that all tags belong to this company
  if (tagIds.length > 0) {
    const tags = await Tag.findAll({
      where: { id: tagIds, companyId },
      attributes: ["id"]
    });
    const validTagIds = tags.map(t => t.id);

    // Build bulk create records, ignoring duplicates
    const records = clients.flatMap(c =>
      validTagIds.map(tagId => ({ clientId: c.id, tagId }))
    );

    if (records.length > 0) {
      await CrmClientTag.bulkCreate(records, { ignoreDuplicates: true });
    }
  }

  return res.status(200).json({ success: true, updated: clients.length });
};

export const bulkRemoveTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { clientIds, tagIds } = req.body as { clientIds: number[]; tagIds: number[] };

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    throw new AppError("clientIds deve ser um array não vazio.");
  }
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    throw new AppError("tagIds deve ser um array não vazio.");
  }

  // Validate that all clients belong to this company
  const clients = await CrmClient.findAll({
    where: { id: clientIds, companyId },
    attributes: ["id"]
  });

  if (clients.length === 0) {
    throw new AppError("Nenhum cliente encontrado.");
  }

  const validClientIds = clients.map(c => c.id);

  await CrmClientTag.destroy({
    where: {
      clientId: validClientIds,
      tagId: tagIds
    }
  });

  return res.status(200).json({ success: true, updated: validClientIds.length });
};

export const bulkAssignPipeline = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { clientIds, pipelineId, stageId, ownerUserId } = req.body as {
    clientIds: number[];
    pipelineId: number;
    stageId: number;
    ownerUserId?: number | string | null;
  };

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    throw new AppError("clientIds deve ser um array nÃ£o vazio.");
  }

  const normalizedPipelineId = Number(pipelineId);
  const normalizedStageId = Number(stageId);

  if (!normalizedPipelineId || !normalizedStageId) {
    throw new AppError("Informe o funil e a etapa para atribuir os clientes.");
  }

  const stage = await PipelineStage.findOne({
    where: {
      id: normalizedStageId,
      pipelineId: normalizedPipelineId,
      companyId
    }
  });

  if (!stage) {
    throw new AppError("Etapa do funil nÃ£o encontrada.");
  }

  const clients = await CrmClient.findAll({
    where: { id: clientIds, companyId }
  });

  if (clients.length === 0) {
    throw new AppError("Nenhum cliente encontrado.");
  }

  const validClientIds = clients.map(client => client.id);
  const hasExplicitOwner =
    ownerUserId !== null && ownerUserId !== undefined && ownerUserId !== "";
  const explicitOwnerUserId = hasExplicitOwner ? Number(ownerUserId) : null;

  const existingLeads = await CrmLead.findAll({
    where: {
      companyId,
      convertedClientId: validClientIds
    }
  });

  const leadsByClientId = new Map(
    existingLeads.map(lead => [lead.convertedClientId, lead])
  );

  const leads: CrmLead[] = [];

  for (const client of clients) {
    let lead = leadsByClientId.get(client.id);
    const targetOwnerUserId = hasExplicitOwner
      ? explicitOwnerUserId
      : client.ownerUserId || lead?.ownerUserId || null;

    if (!lead) {
      lead = await CrmLead.create({
        companyId,
        name: client.name,
        email: client.email,
        phone: client.phone,
        document: client.document,
        companyName: client.companyName,
        address: client.address,
        product: client.acquiredProduct,
        paymentType: client.paymentType,
        purchaseType: client.purchaseType,
        purchaseValue: client.purchaseValue,
        acquisitionDate: client.acquisitionDate,
        expirationDate: client.expirationDate,
        clientSince: client.clientSince,
        ownerUserId: targetOwnerUserId,
        pipelineId: normalizedPipelineId,
        stageId: normalizedStageId,
        convertedClientId: client.id,
        convertedAt: new Date(),
        status: "convertido",
        leadStatus: "convertido",
        source: "Cliente"
      });
    }

    leads.push(lead);

    if (hasExplicitOwner && Number(client.ownerUserId || 0) !== Number(explicitOwnerUserId || 0)) {
      await client.update({ ownerUserId: explicitOwnerUserId });
    }
  }

  let opportunitiesCreated = 0;
  let opportunitiesUpdated = 0;

  for (const lead of leads) {
    const client = clients.find(item => item.id === lead.convertedClientId);
    const targetOwnerUserId = hasExplicitOwner
      ? explicitOwnerUserId
      : lead.ownerUserId || client?.ownerUserId || null;

    await lead.update({
      pipelineId: normalizedPipelineId,
      stageId: normalizedStageId,
      ownerUserId: targetOwnerUserId,
      status: "convertido",
      leadStatus: "convertido"
    });

    const opportunity = await Opportunity.findOne({
      where: {
        companyId,
        leadId: lead.id
      },
      order: [["updatedAt", "DESC"]]
    });

    if (opportunity) {
      await opportunity.update({
        pipelineId: normalizedPipelineId,
        stageId: normalizedStageId,
        assignedUserId: targetOwnerUserId,
        status: "OPEN"
      });
      const io = getIO();
      io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
        action: "update",
        opportunity
      });
      opportunitiesUpdated += 1;
    } else {
      await CreateOpportunityService({
        companyId,
        pipelineId: normalizedPipelineId,
        stageId: normalizedStageId,
        leadId: lead.id,
        title: lead.name || lead.companyName || `Lead ${lead.id}`,
        value: lead.purchaseValue != null ? Number(lead.purchaseValue) : 0,
        assignedUserId: targetOwnerUserId || undefined
      });
      opportunitiesCreated += 1;
    }
  }

  const io = getIO();
  for (const lead of leads) {
    io.to(companyId.toString()).emit(`company-${companyId}-lead`, {
      action: "update",
      lead
    });
  }

  return res.status(200).json({
    success: true,
    clients: validClientIds.length,
    leads: leads.length,
    opportunitiesCreated,
    opportunitiesUpdated,
    skipped: validClientIds.length - leads.length
  });
};

export const importClients = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file;

  if (!file) {
    throw new AppError("O arquivo é obrigatório");
  }

  const { ownerUserId, source, autoTag, mapping, selectedRows } = req.body;

  let parsedMapping;
  if (mapping) {
    try {
      parsedMapping = JSON.parse(mapping);
    } catch (err) {
      throw new AppError("Mapeamento inválido");
    }
  }

  let parsedSelectedRows;
  if (selectedRows && selectedRows !== "undefined") {
    try {
      parsedSelectedRows = JSON.parse(selectedRows);
    } catch (err) { }
  }

  const result = await ImportCrmClientsService({
    companyId,
    filePath: file.path,
    ownerUserId: ownerUserId ? Number(ownerUserId) : undefined,
    source,
    autoTag,
    mapping: parsedMapping,
    selectedRows: parsedSelectedRows,
  });

  return res.status(200).json(result);
};
