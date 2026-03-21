import { Request, Response } from "express";
import CreateOpportunityEventService from "../services/OpportunityServices/CreateOpportunityEventService";
import { createTransporter } from "../services/SmtpServices/smtpService";
import { GetSmtpSettingByCompany } from "../helpers/GetSmtpSettingByCompany";

export const sendCrmEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { nome, email, telefone, empresa, segmento, mensagem } = req.body;
    const { companyId } = req.user;

    const destinatario = process.env.CRM_CONTACT_EMAIL;
    if (!destinatario) {
      return res.status(500).json({ error: "Destinatário de contato CRM não configurado (CRM_CONTACT_EMAIL)." });
    }

    const smtpSetting = await GetSmtpSettingByCompany(companyId);
    if (!smtpSetting) {
      return res.status(400).json({ error: "SMTP não configurado para esta empresa." });
    }

    const htmlContent = `
      <h2>Nova Solicitação de CRM Personalizado</h2>
      <p><strong>Nome:</strong> ${nome}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Telefone:</strong> ${telefone}</p>
      <p><strong>Empresa:</strong> ${empresa}</p>
      <p><strong>Segmento:</strong> ${segmento}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${mensagem}</p>
      <hr>
      <p><small>Enviado via formulário do dashboard</small></p>
    `;

    const transporter = await createTransporter(companyId);
    await transporter.sendMail({
      from: `"${smtpSetting.senderName}" <${smtpSetting.senderEmail}>`,
      to: destinatario,
      subject: `Solicitação CRM - ${empresa}`,
      html: htmlContent
    });

    return res.status(200).json({ message: "Email enviado com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return res.status(500).json({ error: "Erro ao enviar email" });
  }
};

export const sendLeadEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { to, subject, body, leadId, opportunityId } = req.body;
    const { companyId } = req.user;

    // Obter credenciais do SMTP da empresa
    const smtpSetting = await GetSmtpSettingByCompany(companyId);
    if (!smtpSetting) {
      return res.status(400).json({ error: "SMTP não configurado para esta empresa." });
    }

    const files = req.files as Express.Multer.File[];
    let attachments: any[] = [];
    let fileNames: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        attachments.push({
          filename: file.originalname,
          path: file.path
        });
        fileNames.push(file.filename);
      }
    }

    const transporter = await createTransporter(companyId);

    const emailOptions = {
      from: `"${smtpSetting.senderName}" <${smtpSetting.senderEmail}>`,
      to,
      subject,
      html: body.replace(/\n/g, '<br/>'),
      attachments
    };

    await transporter.sendMail(emailOptions);

    if (opportunityId) {
      // Registrar no histórico "OpportunityEvents"
      await CreateOpportunityEventService({
        opportunityId: Number(opportunityId),
        companyId,
        type: "EMAIL",
        metadata: {
          to,
          subject,
          body,
          files: fileNames
        }
      });
    }

    return res.status(200).json({ message: "E-mail enviado com sucesso" });
  } catch (error) {
    console.error("Erro ao enviar e-mail via lead:", error);
    return res.status(500).json({ error: error.message || "Erro interno ao enviar e-mail" });
  }
};

