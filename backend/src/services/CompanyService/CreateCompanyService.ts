import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import User from "../../models/User";
import sequelize from "../../database";
import CompaniesSettings from "../../models/CompaniesSettings";
import Setting from "../../models/Setting";
import CloneTemplateToPipelineService from "../PipelineServices/CloneTemplateToPipelineService";

interface CompanyData {
  name: string;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  dueDate?: string;
  recurrence?: string;
  document?: string;
  paymentMethod?: string;
  password?: string;
  companyUserName?: string;
  campaignsEnabled?: boolean;
  type?: "pf" | "pj";
  segment?: string;
  expiration_date?: string;
  billing_cycle?: string;
}

const CreateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {
  const {
    name,
    phone,
    password,
    email,
    status,
    planId,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    companyUserName,
    campaignsEnabled,
    type,
    segment,
    expiration_date,
    billing_cycle
  } = companyData;

  const companySchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_COMPANY_INVALID_NAME")
      .required("ERR_COMPANY_INVALID_NAME")
  });

  try {
    await companySchema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const t = await sequelize.transaction();

  try {
    const company = await Company.create({
      name,
      phone,
      email,
      status,
      planId,
      dueDate,
      recurrence,
      document,
      paymentMethod,
      type,
      segment,
      expiration_date,
      billing_cycle
    },
      { transaction: t }
    );

    const user = await User.create({
      name: companyUserName ? companyUserName : name,
      email: company.email,
      password: password ? password : "mudar123",
      profile: "admin",
      companyId: company.id
    },
      { transaction: t }
    );

    const settings = await CompaniesSettings.create({
      companyId: company.id,
      hoursCloseTicketsAuto: "9999999999",
      chatBotType: "text",
      acceptCallWhatsapp: "enabled",
      userRandom: "enabled",
      sendGreetingMessageOneQueues: "enabled",
      sendSignMessage: "enabled",
      sendFarewellWaitingTicket: "disabled",
      userRating: "disabled",
      sendGreetingAccepted: "enabled",
      CheckMsgIsGroup: "enabled",
      sendQueuePosition: "disabled",
      scheduleType: "disabled",
      acceptAudioMessageContact: "enabled",
      sendMsgTransfTicket: "disabled",
      enableLGPD: "disabled",
      requiredTag: "disabled",
      lgpdDeleteMessage: "disabled",
      lgpdHideNumber: "disabled",
      lgpdConsent: "disabled",
      lgpdLink: "",
      lgpdMessage: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      closeTicketOnTransfer: false,
      DirectTicketsToWallets: false
    }, { transaction: t })

    if (typeof campaignsEnabled === "boolean") {
      await Setting.create(
        {
          key: "campaignsEnabled",
          value: `${campaignsEnabled}`,
          companyId: company.id
        },
        { transaction: t }
      );
    }

    await t.commit();

    // Criar Pipeline inicial baseado em Template (fora da transação — não é fatal)
    try {
      await CloneTemplateToPipelineService({ companyId: company.id });
    } catch (pipelineError: any) {
      console.warn(`[CreateCompanyService] Aviso: pipeline inicial não criado para empresa ${company.id}:`, pipelineError?.message);
    }

    return company;
  } catch (error: any) {
    await t.rollback();
    throw new AppError(error?.message || "Não foi possível criar a empresa!", 500);
  }
};

export default CreateCompanyService;