import { Request, Response } from "express";
import ListCrmClientsService from "../services/CrmClientService/ListCrmClientsService";
import CreateCrmClientService from "../services/CrmClientService/CreateCrmClientService";
import ShowCrmClientService from "../services/CrmClientService/ShowCrmClientService";
import UpdateCrmClientService from "../services/CrmClientService/UpdateCrmClientService";
import DeleteCrmClientService from "../services/CrmClientService/DeleteCrmClientService";
import ImportCrmClientsService from "../services/CrmClientService/ImportCrmClientsService";
import AppError from "../errors/AppError";
import CrmClient from "../models/CrmClient";
import CrmClientTag from "../models/CrmClientTag";
import Tag from "../models/Tag";

export const index = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const {
    searchParam,
    status,
    type,
    clientSinceYear,
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
