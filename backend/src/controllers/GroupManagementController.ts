import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import { getWbot } from "../libs/wbot";
import logger from "../utils/logger";

/**
 * Lists all WhatsApp groups from all active connections of the company.
 */
export const listGroups = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const whatsapps = await Whatsapp.findAll({
        where: { companyId, status: "CONNECTED" },
        attributes: ["id", "name", "number"]
    });

    const groupsByConnection: { whatsappId: number; whatsappName: string; groups: any[] }[] = [];

    for (const wa of whatsapps) {
        try {
            const wbot = getWbot(wa.id);
            const groups = await (wbot as any).groupFetchAllParticipating();

            const groupList = Object.values(groups as Record<string, any>).map((g: any) => ({
                id: g.id,
                subject: g.subject,
                creation: g.creation,
                owner: g.owner,
                size: g.participants?.length || 0,
                desc: g.desc || ""
            }));

            groupsByConnection.push({
                whatsappId: wa.id,
                whatsappName: wa.name,
                groups: groupList
            });
        } catch (err) {
            logger.warn(`[GroupManagement] Error fetching groups for wapp ${wa.id}: ${err.message}`);
            groupsByConnection.push({ whatsappId: wa.id, whatsappName: wa.name, groups: [] });
        }
    }

    return res.json(groupsByConnection);
};

/**
 * Returns detailed metadata (members, admins) for a specific group.
 */
export const getGroupInfo = async (req: Request, res: Response): Promise<Response> => {
    const { jid } = req.params;
    const { whatsappId } = req.query;
    const { companyId } = req.user;

    if (!whatsappId) {
        return res.status(400).json({ error: "whatsappId query param required" });
    }

    const wa = await Whatsapp.findOne({ where: { id: Number(whatsappId), companyId } });
    if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

    try {
        const wbot = getWbot(wa.id);
        const metadata = await (wbot as any).groupMetadata(jid);

        return res.json({
            id: metadata.id,
            subject: metadata.subject,
            desc: metadata.desc || "",
            creation: metadata.creation,
            owner: metadata.owner,
            participants: metadata.participants.map((p: any) => ({
                id: p.id,
                isAdmin: p.admin === "admin" || p.admin === "superadmin",
                isSuperAdmin: p.admin === "superadmin"
            }))
        });
    } catch (err) {
        logger.error(`[GroupManagement] groupMetadata error: ${err.message}`);
        return res.status(500).json({ error: "Failed to fetch group info" });
    }
};

/**
 * Sends a message mentioning all group members (@everyone simulation).
 */
export const tagAll = async (req: Request, res: Response): Promise<Response> => {
    const { jid } = req.params;
    const { whatsappId, message } = req.body;
    const { companyId } = req.user;

    if (!whatsappId) return res.status(400).json({ error: "whatsappId required" });

    const wa = await Whatsapp.findOne({ where: { id: Number(whatsappId), companyId } });
    if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

    try {
        const wbot = getWbot(wa.id);
        const metadata = await (wbot as any).groupMetadata(jid);
        const mentions = metadata.participants.map((p: any) => p.id);

        const text = message
            ? `${message}\n\n${mentions.map((m: string) => `@${m.split("@")[0]}`).join(" ")}`
            : mentions.map((m: string) => `@${m.split("@")[0]}`).join(" ");

        await (wbot as any).sendMessage(jid, { text, mentions });

        return res.json({ success: true, mentioned: mentions.length });
    } catch (err) {
        logger.error(`[GroupManagement] tagAll error: ${err.message}`);
        return res.status(500).json({ error: "Failed to tag all members" });
    }
};

/**
 * Removes a member from the group.
 */
export const kickMember = async (req: Request, res: Response): Promise<Response> => {
    const { jid, memberId } = req.params;
    const { whatsappId } = req.body;
    const { companyId } = req.user;

    const wa = await Whatsapp.findOne({ where: { id: Number(whatsappId), companyId } });
    if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

    try {
        const wbot = getWbot(wa.id);
        await (wbot as any).groupParticipantsUpdate(jid, [memberId], "remove");
        return res.json({ success: true });
    } catch (err) {
        logger.error(`[GroupManagement] kickMember error: ${err.message}`);
        return res.status(500).json({ error: "Failed to remove member" });
    }
};

/**
 * Promotes a member to admin.
 */
export const promoteMember = async (req: Request, res: Response): Promise<Response> => {
    const { jid, memberId } = req.params;
    const { whatsappId } = req.body;
    const { companyId } = req.user;

    const wa = await Whatsapp.findOne({ where: { id: Number(whatsappId), companyId } });
    if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

    try {
        const wbot = getWbot(wa.id);
        await (wbot as any).groupParticipantsUpdate(jid, [memberId], "promote");
        return res.json({ success: true });
    } catch (err) {
        logger.error(`[GroupManagement] promoteMember error: ${err.message}`);
        return res.status(500).json({ error: "Failed to promote member" });
    }
};

/**
 * Demotes an admin to regular member.
 */
export const demoteMember = async (req: Request, res: Response): Promise<Response> => {
    const { jid, memberId } = req.params;
    const { whatsappId } = req.body;
    const { companyId } = req.user;

    const wa = await Whatsapp.findOne({ where: { id: Number(whatsappId), companyId } });
    if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

    try {
        const wbot = getWbot(wa.id);
        await (wbot as any).groupParticipantsUpdate(jid, [memberId], "demote");
        return res.json({ success: true });
    } catch (err) {
        logger.error(`[GroupManagement] demoteMember error: ${err.message}`);
        return res.status(500).json({ error: "Failed to demote member" });
    }
};

/**
 * Returns the group's invite link.
 */
export const getInviteLink = async (req: Request, res: Response): Promise<Response> => {
    const { jid } = req.params;
    const { whatsappId } = req.query;
    const { companyId } = req.user;

    const wa = await Whatsapp.findOne({ where: { id: Number(whatsappId), companyId } });
    if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

    try {
        const wbot = getWbot(wa.id);
        const code = await (wbot as any).groupInviteCode(jid);
        return res.json({ inviteLink: `https://chat.whatsapp.com/${code}`, code });
    } catch (err) {
        logger.error(`[GroupManagement] getInviteLink error: ${err.message}`);
        return res.status(500).json({ error: "Failed to get invite link" });
    }
};

/**
 * Revokes the group's current invite link (generates a new one).
 */
export const revokeInviteLink = async (req: Request, res: Response): Promise<Response> => {
    const { jid } = req.params;
    const { whatsappId } = req.body;
    const { companyId } = req.user;

    const wa = await Whatsapp.findOne({ where: { id: Number(whatsappId), companyId } });
    if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

    try {
        const wbot = getWbot(wa.id);
        await (wbot as any).groupRevokeInvite(jid);
        const newCode = await (wbot as any).groupInviteCode(jid);
        return res.json({ success: true, newInviteLink: `https://chat.whatsapp.com/${newCode}` });
    } catch (err) {
        logger.error(`[GroupManagement] revokeInviteLink error: ${err.message}`);
        return res.status(500).json({ error: "Failed to revoke invite link" });
    }
};
