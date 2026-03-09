import SmtpSetting from "../../models/SmtpSetting";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

export interface ResolvedSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  senderEmail: string;
  senderName: string;
}

const ResolveSmtpConfigService = async (
  channel: Whatsapp
): Promise<ResolvedSmtpConfig> => {
  if (channel.emailUseCompanySmtp) {
    const smtpSetting = await SmtpSetting.findOne({
      where: { companyId: channel.companyId }
    });

    if (!smtpSetting) {
      throw new AppError("SMTP da empresa nao configurado para este canal de e-mail.", 400);
    }

    return {
      host: smtpSetting.host,
      port: smtpSetting.port,
      secure: smtpSetting.secure,
      user: smtpSetting.user,
      password: smtpSetting.password,
      senderEmail: channel.emailAddress || smtpSetting.senderEmail,
      senderName: channel.emailDisplayName || smtpSetting.senderName || channel.name
    };
  }

  if (
    !channel.emailSmtpHost ||
    !channel.emailSmtpUser ||
    !channel.emailSmtpPassword ||
    !channel.emailSmtpPort
  ) {
    throw new AppError("SMTP proprio do canal de e-mail incompleto.", 400);
  }

  return {
    host: channel.emailSmtpHost,
    port: Number(channel.emailSmtpPort),
    secure: Boolean(channel.emailSmtpSecure),
    user: channel.emailSmtpUser,
    password: channel.emailSmtpPassword,
    senderEmail: channel.emailAddress || channel.emailSmtpUser,
    senderName: channel.emailDisplayName || channel.name
  };
};

export default ResolveSmtpConfigService;

