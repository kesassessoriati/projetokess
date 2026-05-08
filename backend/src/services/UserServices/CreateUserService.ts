import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import User from "../../models/User";
import Plan from "../../models/Plan";
import Company from "../../models/Company";
import strongPasswordRegex, { passwordPolicyMessage } from "../../helpers/passwordPolicy";
import {
  ensureUserIdentifierIsAvailable,
  isValidUsername,
  makeInternalEmail,
  normalizeEmail,
  normalizePhone,
  normalizeUsername
} from "../../helpers/userIdentity";

interface Request {
  email?: string;
  username?: string;
  phone?: string;
  password: string;
  name: string;
  queueIds?: number[];
  serviceIds?: number[];
  companyId?: number;
  profile?: string;
  startWork?: string;
  endWork?: string;
  whatsappId?: number;
  allTicket?: string;
  defaultTheme?: string;
  defaultMenu?: string;
  allowGroup?: boolean;
  allHistoric?: string;
  allUserChat?: string;
  userClosePendingTicket?: string;
  showDashboard?: string;
  defaultTicketsManagerWidth?: number;
  allowRealTime?: string;
  allowConnections?: string;
  userType?: string;
  workDays?: string;
  lunchStart?: string;
  lunchEnd?: string;
}

interface Response {
  email: string;
  username?: string;
  phone?: string;
  name: string;
  id: number;
  profile: string;
}

const CreateUserService = async ({
  email,
  username,
  phone,
  password,
  name,
  queueIds = [],
  serviceIds = [],
  companyId,
  profile = "admin",
  startWork,
  endWork,
  whatsappId,
  allTicket,
  defaultTheme,
  defaultMenu,
  allowGroup,
  allHistoric,
  allUserChat,
  userClosePendingTicket,
  showDashboard,
  defaultTicketsManagerWidth = 550,
  allowRealTime,
  allowConnections,
  userType = "attendant",
  workDays = "1,2,3,4,5",
  lunchStart,
  lunchEnd
}: Request): Promise<Response> => {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email) || makeInternalEmail({
    username: normalizedUsername,
    phone: normalizedPhone,
    companyId
  });

  if (!normalizeEmail(email) && !normalizedUsername && !normalizedPhone) {
    throw new AppError("Informe e-mail, telefone ou usuario para login.");
  }

  if (!isValidUsername(normalizedUsername)) {
    throw new AppError("Usuario deve ter 3 a 40 caracteres e usar apenas letras, numeros, ponto, hifen ou underline.");
  }

  if (companyId !== undefined) {
    const company = await Company.findOne({
      where: {
        id: companyId
      },
      include: [{ model: Plan, as: "plan" }]
    });

    if (company !== null) {
      const usersCount = await User.count({
        where: {
          companyId
        }
      });

      if (usersCount >= company.plan.users) {
        throw new AppError(
          `Número máximo de usuários já alcançado: ${usersCount}`
        );
      }
    }
  }

  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    allHistoric: Yup.string(),
    email: Yup.string()
      .email()
      .required()
      .test("Check-email", "An user with this email already exists.", async value => Boolean(value)),
    password: Yup.string()
      .required(passwordPolicyMessage)
      .matches(strongPasswordRegex, passwordPolicyMessage)
  });

  try {
    await schema.validate({ email: normalizedEmail, password, name });
    await ensureUserIdentifierIsAvailable({
      email: normalizedEmail,
      username: normalizedUsername,
      phone: normalizedPhone,
      companyId
    });
  } catch (err) {
    throw new AppError(err.message);
  }

  const user = await User.create(
    {
      email: normalizedEmail,
      username: normalizedUsername || null,
      phone: normalizedPhone || null,
      password,
      name,
      companyId,
      profile,
      startWork,
      endWork,
      whatsappId: whatsappId || null,
      allTicket,
      defaultTheme,
      defaultMenu,
      allowGroup,
      allHistoric,
      allUserChat,
      userClosePendingTicket,
      showDashboard,
      defaultTicketsManagerWidth,
      allowRealTime,
      allowConnections,
      userType,
      workDays,
      lunchStart: lunchStart || null,
      lunchEnd: lunchEnd || null
    },
    { include: ["queues", "company", "services"] }
  );

  await user.$set("queues", queueIds);

  // Vincular serviços se for profissional
  if (userType === "professional" && serviceIds.length > 0) {
    await user.$set("services", serviceIds);
  }

  await user.reload();

  const serializedUser = SerializeUser(user);

  return serializedUser;
};

export default CreateUserService;
