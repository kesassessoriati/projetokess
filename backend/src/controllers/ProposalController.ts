import { Request, Response } from "express";
import { Op } from "sequelize";

import ListProposalsService from "../services/ProposalService/ListProposalsService";
import CreateProposalService from "../services/ProposalService/CreateProposalService";
import ShowProposalService from "../services/ProposalService/ShowProposalService";
import UpdateProposalService from "../services/ProposalService/UpdateProposalService";
import DeleteProposalService from "../services/ProposalService/DeleteProposalService";
import DuplicateProposalService from "../services/ProposalService/DuplicateProposalService";
import Proposal from "../models/Proposal";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, status, pageNumber } = req.query as {
    searchParam?: string;
    status?: string;
    pageNumber?: string;
  };

  const result = await ListProposalsService({ companyId, searchParam, status, pageNumber });
  return res.json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { proposalId } = req.params;

  const proposal = await ShowProposalService({ id: proposalId, companyId });
  return res.json(proposal);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { title, clientName, contactId, status, validUntil, notes, data } = req.body;

  const proposal = await CreateProposalService({
    companyId,
    title,
    clientName,
    contactId: contactId || null,
    status,
    validUntil,
    notes,
    data
  });

  return res.status(201).json(proposal);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { proposalId } = req.params;
  const { title, clientName, contactId, status, validUntil, notes, data } = req.body;

  const proposal = await UpdateProposalService({
    id: proposalId,
    companyId,
    title,
    clientName,
    contactId,
    status,
    validUntil,
    notes,
    data
  });

  return res.json(proposal);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { proposalId } = req.params;

  await DeleteProposalService({ id: proposalId, companyId });
  return res.json({ message: "Proposta removida com sucesso" });
};

export const duplicate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { proposalId } = req.params;

  const proposal = await DuplicateProposalService({ id: proposalId, companyId });
  return res.status(201).json(proposal);
};

export const showPublic = async (req: Request, res: Response): Promise<Response> => {
  const { slug } = req.params;

  const proposal = await Proposal.findOne({
    where: {
      slug,
      status: {
        [Op.in]: ["enviada", "aceita"]
      }
    }
  });

  if (!proposal) {
    return res.status(404).json({ error: "Proposta não encontrada ou não está disponível" });
  }

  return res.json(proposal);
};
