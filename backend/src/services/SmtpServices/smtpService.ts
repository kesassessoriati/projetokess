import nodemailer from "nodemailer";
import { GetSmtpSettingByCompany } from "../../helpers/GetSmtpSettingByCompany";

export async function createTransporter(companyId: number) {
    const config = await GetSmtpSettingByCompany(companyId);

    if (!config) {
        throw new Error("SMTP não configurado para esta empresa");
    }

    const { host, port, secure, user, password } = config;

    return nodemailer.createTransport({
        host: host.trim(),
        port: Number(port),
        secure: Boolean(secure),
        auth: {
            user: user.trim(),
            pass: password.trim()
        },
        tls: { rejectUnauthorized: false }
    });
}
