import SmtpSetting from "../models/SmtpSetting";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  senderName: string;
  senderEmail: string;
}

/**
 * Obtém as configurações SMTP da empresa.
 * Primeiro tenta o modelo SmtpSetting (por tenant); fallback para env vars.
 */
export async function GetSmtpSettingByCompany(companyId: number): Promise<SmtpConfig | null> {
  try {
    const smtp = await SmtpSetting.findOne({ where: { companyId } });

    if (smtp && smtp.host && smtp.user && smtp.password) {
      return {
        host: smtp.host,
        port: smtp.port || 587,
        user: smtp.user,
        password: smtp.password, // getter já decripta
        secure: smtp.secure ?? false,
        senderName: smtp.senderName || smtp.user,
        senderEmail: smtp.senderEmail || smtp.user
      };
    }
  } catch (err) {
    // fallback abaixo
  }

  // Fallback para variáveis de ambiente globais
  if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
    return {
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || "465"),
      user: process.env.MAIL_USER,
      password: process.env.MAIL_PASS,
      secure: parseInt(process.env.MAIL_PORT || "465") === 465,
      senderName: process.env.MAIL_FROM || process.env.MAIL_USER,
      senderEmail: process.env.MAIL_FROM || process.env.MAIL_USER
    };
  }

  return null;
}
