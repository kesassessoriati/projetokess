import nodemailer from "nodemailer";
import { GetSmtpSettingByCompany } from "../../helpers/GetSmtpSettingByCompany";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

export function createTransporterFromConfig(config: SmtpConfig) {
  const port = Number(config.port);
  const secure = port === 465 ? true : Boolean(config.secure);
  return nodemailer.createTransport({
    host: config.host.trim(),
    port,
    secure,
    requireTLS: !secure, // STARTTLS obrigatório em porta 587
    auth: {
      user: config.user.trim(),
      pass: config.password.trim()
    },
    tls: {
      rejectUnauthorized: true
    }
  });
}

export async function createTransporter(companyId: number) {
  const config = await GetSmtpSettingByCompany(companyId);

  if (!config) {
    throw new Error("SMTP não configurado para esta empresa");
  }

  return createTransporterFromConfig({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    password: config.password
  });
}
