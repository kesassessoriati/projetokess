import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListService from "../services/ContactListItemService/ListService";
import CreateService from "../services/ContactListItemService/CreateService";
import ShowService from "../services/ContactListItemService/ShowService";
import UpdateService from "../services/ContactListItemService/UpdateService";
import DeleteService from "../services/ContactListItemService/DeleteService";
import FindService from "../services/ContactListItemService/FindService";
import ImportContactListItemsService from "../services/ContactListItemService/ImportContactListItemsService";

import ContactListItem from "../models/ContactListItem";

import AppError from "../errors/AppError";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
  contactListId: string | number;
};

type StoreData = {
  name: string;
  number: string;
  contactListId: number;
  companyId?: string;
  email?: string;
};

type FindParams = {
  companyId: number;
  contactListId: number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, contactListId } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { contacts, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId,
    contactListId
  });

  return res.json({ contacts, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await CreateService({
    ...data,
    companyId
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-ContactListItem`, {
      action: "create",
      record
    });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body as StoreData;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    id
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-ContactListItem`, {
      action: "update",
      record
    });

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-ContactListItem`, {
      action: "delete",
      id
    });

  return res.status(200).json({ message: "Contact deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const params = req.query as unknown as FindParams;
  const records: ContactListItem[] = await FindService(params);

  return res.status(200).json(records);
};

export const importItems = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file as Express.Multer.File;

  if (!file) {
    throw new AppError("O arquivo é obrigatório");
  }

  const { contactListId, mapping, selectedRows } = req.body;

  if (!contactListId) {
    throw new AppError("contactListId é obrigatório");
  }

  let parsedMapping: Record<string, string> | undefined;
  if (mapping) {
    try {
      parsedMapping = JSON.parse(mapping);
    } catch {
      throw new AppError("Mapeamento inválido");
    }
  }

  let parsedSelectedRows: string[] | undefined;
  if (selectedRows) {
    try {
      parsedSelectedRows = JSON.parse(selectedRows);
    } catch { }
  }

  const result = await ImportContactListItemsService({
    companyId,
    contactListId: Number(contactListId),
    filePath: file.path,
    mapping: parsedMapping,
    selectedRows: parsedSelectedRows,
  });

  return res.status(200).json(result);
};
