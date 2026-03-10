import { createTransporter } from "../services/SmtpServices/smtpService";
import { GetSmtpSettingByCompany } from "./GetSmtpSettingByCompany";

export interface MailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function SendMailWithSettings(mailData: MailData): Promise<boolean> {
  try {
    const smtpSettings = await GetSmtpSettingByCompany(1);

    if (!smtpSettings) {
      console.log("SMTP not configured");
      return false;
    }

    const transporter = await createTransporter(1);

    const info = await transporter.sendMail({
      from: smtpSettings.senderEmail,
      to: mailData.to,
      subject: mailData.subject,
      text: mailData.text,
      html: mailData.html || mailData.text
    });

    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// Função para substituir variáveis no texto
export function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}


