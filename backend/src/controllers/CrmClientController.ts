import { Request, Response } from "express";
import ListCrmClientsService from "../services/CrmClientService/ListCrmClientsService";
import CreateCrmClientService from "../services/CrmClientService/CreateCrmClientService";
import ShowCrmClientService from "../services/CrmClientService/ShowCrmClientService";
import UpdateCrmClientService from "../services/CrmClientService/UpdateCrmClientService";
import DeleteCrmClientService from "../services/CrmClientService/DeleteCrmClientService";

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

  await DeleteCrmClientService({
    id: Number(clientId),
    companyId
  });

  return res.status(204).send();
};
