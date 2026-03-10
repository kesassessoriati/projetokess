import { Request, Response } from "express";
import SmtpSetting from "../models/SmtpSetting";
import { createTransporter } from "../services/SmtpServices/smtpService";
import { GetSmtpSettingByCompany } from "../helpers/GetSmtpSettingByCompany";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const smtpSetting = await SmtpSetting.findOne({
        where: { companyId },
        attributes: { exclude: ['password'] }
    });

    return res.json(smtpSetting);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { host, port, user, password, secure, senderName, senderEmail } = req.body;

    // Trim para evitar espaços acidentais em campos críticos
    const cleanPassword = password ? String(password).trim() : undefined;

    let smtpSetting = await SmtpSetting.findOne({
        where: { companyId }
    });

    if (smtpSetting) {
        await smtpSetting.update({
            host: host?.trim(),
            port: Number(port) || 587,
            user: user?.trim(),
            password: cleanPassword || undefined,
            secure: Boolean(secure),
            senderName,
            senderEmail
        });
    } else {
        smtpSetting = await SmtpSetting.create({
            host: host?.trim(),
            port: Number(port) || 587,
            user: user?.trim(),
            password: cleanPassword,
            secure: Boolean(secure),
            senderName,
            senderEmail,
            companyId
        });
    }

    const smtpObj = smtpSetting.toJSON() as any;
    delete smtpObj.password;

    return res.status(200).json(smtpObj);
};

export const test = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { emailDestino } = req.body;

    if (!emailDestino) {
        throw new AppError("O e-mail de destino é obrigatório", 400);
    }

    try {
        const config = await GetSmtpSettingByCompany(companyId);
        if (!config) {
            throw new AppError("SMTP não configurado para esta empresa", 400);
        }
        const transporter = await createTransporter(companyId);

        // Verifica conexão e autenticação antes de tentar enviar
        await transporter.verify();
        console.log("SMTP verify OK - user:", config.user, "host:", config.host, "port:", config.port);

        await transporter.sendMail({
            from: `"${config.senderName || "Sistema CRM"}" <${config.senderEmail || "teste@crm"}>`,
            to: emailDestino,
            subject: "Teste de configuração SMTP",
            html: "Seu SMTP foi configurado com sucesso."
        });

        console.log("SMTP send success");
        return res.status(200).json({ message: "SMTP configurado com sucesso" });
    } catch (error: any) {
        console.error("SMTP Error:", error);
        throw new AppError(`Falha no teste SMTP: ${error.message}`, 400);
    }
};
