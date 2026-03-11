import { Request, Response } from "express";
import ListCrmClientsService from "../services/CrmClientService/ListCrmClientsService";
import CreateCrmClientService from "../services/CrmClientService/CreateCrmClientService";
import ShowCrmClientService from "../services/CrmClientService/ShowCrmClientService";
import UpdateCrmClientService from "../services/CrmClientService/UpdateCrmClientService";
import DeleteCrmClientService from "../services/CrmClientService/DeleteCrmClientService";
import ImportCrmClientsService from "../services/CrmClientService/ImportCrmClientsService";
import AppError from "../errors/AppError";

export const index = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const {
    searchParam,
    status,
    type,
    ownerUserId,
    pageNumber,
    limit
  } = req.query as any;

  const result = await ListCrmClientsService({
    companyId,
    searchParam,
    status,
    type,
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
