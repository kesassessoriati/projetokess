import nodemailer from "nodemailer";
import { GetSmtpSettingByCompany } from "../../helpers/GetSmtpSettingByCompany";

export async function createTransporter(companyId: number) {
    const config = await GetSmtpSettingByCompany(companyId);

    if (!config) {
        throw new Error("SMTP não configurado para esta empresa");
    }

    const { host, port, secure, user, password, senderName, senderEmail } = config;

    return nodemailer.createTransport({
        host,
        port,
        secure, // true for 465, false for other ports
        auth: {
            user,
            pass: password // Already decrypted explicitly via model
        },
        tls: !secure ? { rejectUnauthorized: false } : undefined
    });
}
