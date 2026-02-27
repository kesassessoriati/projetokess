import { Request, Response } from "express";
import { SendMail } from "../helpers/SendMail";
import nodemailer from "nodemailer";
import SmtpSetting from "../models/SmtpSetting";
import CreateOpportunityEventService from "../services/OpportunityServices/CreateOpportunityEventService";

export const sendCrmEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { nome, email, telefone, empresa, segmento, mensagem } = req.body;

    // Montar HTML do email
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

    // Usar a função SendMail existente
    await SendMail({
      to: "rafaeloficialpaixao@gmail.com",
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
    const smtpSetting = await SmtpSetting.findOne({ where: { companyId } });
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

    const { host, port, user, password, secure, senderName, senderEmail } = smtpSetting;

    const transporterOptions: any = {
      host,
      port,
      secure,
      auth: {
        user,
        pass: password
      }
    };

    if (!secure) {
      transporterOptions.tls = {
        rejectUnauthorized: false
      };
    }

    const transporter = nodemailer.createTransport(transporterOptions);

    const emailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
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

