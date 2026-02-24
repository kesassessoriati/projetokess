import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import TicketNote from "../models/TicketNote";

import ListTicketNotesService from "../services/TicketNoteService/ListTicketNotesService";
import CreateTicketNoteService from "../services/TicketNoteService/CreateTicketNoteService";
import UpdateTicketNoteService from "../services/TicketNoteService/UpdateTicketNoteService";
import ShowTicketNoteService from "../services/TicketNoteService/ShowTicketNoteService";
import FindAllTicketNotesService from "../services/TicketNoteService/FindAllTicketNotesService";
import DeleteTicketNoteService from "../services/TicketNoteService/DeleteTicketNoteService";
import FindNotesByContactIdAndTicketId from "../services/TicketNoteService/FindNotesByContactIdAndTicketId";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  onlyPrivate?: string;
};

type StoreTicketNoteData = {
  note: string;
  userId: number;
  contactId: number | 0;
  ticketId: number | 0;
  isPrivate?: boolean;
  id?: number | string;
};

type UpdateTicketNoteData = {
  note?: string;
  isPrivate?: boolean;
  id?: number | string;
};

type QueryFilteredNotes = {
  contactId: number | string;
  ticketId: number | string;
  includePublic?: string;
};

// ─── INDEX: lista paginada de notas da empresa ────────────────────────────
export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, onlyPrivate } = req.query as IndexQuery;
  // ⚠️ Sempre usa companyId do JWT — nunca do body/query
  const { companyId } = req.user;

  const { ticketNotes, count, hasMore } = await ListTicketNotesService({
    searchParam,
    pageNumber,
    companyId,
    onlyPrivate: onlyPrivate === "true"
  });

  return res.json({ ticketNotes, count, hasMore });
};

// ─── LIST: todas as notas da empresa (sem paginação) ─────────────────────
export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const ticketNotes: TicketNote[] = await FindAllTicketNotesService(companyId);
  return res.status(200).json(ticketNotes);
};

// ─── STORE: cria nota privada ─────────────────────────────────────────────
export const store = async (req: Request, res: Response): Promise<Response> => {
  const noteData: StoreTicketNoteData = req.body;
  const { id: userId, companyId } = req.user;

  const schema = Yup.object().shape({
    note: Yup.string().min(2).required()
  });

  try {
    await schema.validate(noteData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const ticketNote = await CreateTicketNoteService({
    ...noteData,
    userId,
    companyId, // ⚠️ Sempre do JWT, nunca do body
    isPrivate: noteData.isPrivate !== undefined ? noteData.isPrivate : true
  });

  return res.status(200).json(ticketNote);
};

// ─── SHOW: detalhe de uma nota (com validação de empresa) ─────────────────
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const ticketNote = await ShowTicketNoteService(id, companyId);

  return res.status(200).json(ticketNote);
};

// ─── UPDATE: edita nota (apenas da própria empresa) ───────────────────────
export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const ticketNoteData: UpdateTicketNoteData = req.body;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    note: Yup.string().min(2)
  });

  try {
    await schema.validate(ticketNoteData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const recordUpdated = await UpdateTicketNoteService(ticketNoteData, companyId);

  return res.status(200).json(recordUpdated);
};

// ─── REMOVE: deleta nota (admin ou próprio autor) ─────────────────────────
export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile, id: userId } = req.user;

  // Busca a nota para verificar autoria antes de deletar
  const ticketNote = await ShowTicketNoteService(id, companyId);

  // Permite deleção se: admin da empresa OU próprio autor
  const isOwner = String(ticketNote.userId) === String(userId);
  const isAdmin = profile === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await DeleteTicketNoteService(id, companyId);

  return res.status(200).json({ message: "Nota privada removida com sucesso" });
};

// ─── FIND FILTERED: notas por contactId + ticketId (rota principal do frontend) ──
export const findFilteredList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { contactId, ticketId, includePublic } = req.query as QueryFilteredNotes;
    const { companyId } = req.user;

    const notes: TicketNote[] = await FindNotesByContactIdAndTicketId({
      contactId,
      ticketId,
      companyId, // ⚠️ Sempre do JWT
      includePublic: includePublic !== "false" // padrão: incluir todas
    });

    return res.status(200).json(notes);
  } catch (e) {
    return res.status(500).json({ message: e.message || e });
  }
};
