import { Request, Response } from "express";
import SmtpSetting from "../models/SmtpSetting";

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

    let smtpSetting = await SmtpSetting.findOne({
        where: { companyId }
    });

    if (smtpSetting) {
        await smtpSetting.update({
            host,
            port,
            user,
            password: password || undefined, // Evitando salvar senha em branco se nao for preenchida
            secure,
            senderName,
            senderEmail
        });
    } else {
        smtpSetting = await SmtpSetting.create({
            host,
            port,
            user,
            password,
            secure,
            senderName,
            senderEmail,
            companyId
        });
    }

    const smtpObj = smtpSetting.toJSON() as any;
    delete smtpObj.password;

    return res.status(200).json(smtpObj);
};
