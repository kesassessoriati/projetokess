import * as Yup from "yup";

import AppError from "../../errors/AppError";
import ShowUserService from "./ShowUserService";
import Company from "../../models/Company";
import User from "../../models/User";
import strongPasswordRegex, { passwordPolicyMessage } from "../../helpers/passwordPolicy";
import {
  ensureUserIdentifierIsAvailable,
  isValidUsername,
  normalizeEmail,
  normalizePhone,
  normalizeUsername
} from "../../helpers/userIdentity";

interface UserData {
  email?: string;
  username?: string;
  phone?: string;
  password?: string;
  name?: string;
  profile?: string;
  companyId?: number;
  queueIds?: number[];
  serviceIds?: number[];
  startWork?: string;
  endWork?: string;
  farewellMessage?: string;
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
  profileImage?: string;
  userType?: string;
  workDays?: string;
  lunchStart?: string;
  lunchEnd?: string;
}

interface Request {
  userData: UserData;
  userId: string | number;
  companyId: number;
  requestUserId: number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId,
  companyId,
  requestUserId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId, companyId);

  const requestUser = await User.findByPk(requestUserId);

  if (requestUser.super === false && userData.companyId !== companyId) {
    throw new AppError("O usuário não pertence à esta empresa");
  }

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    allHistoric: Yup.string(),
    email: Yup.string().email(),
    username: Yup.string().nullable(),
    phone: Yup.string().nullable(),
    profile: Yup.string(),
    password: Yup.string()
      .nullable()
      .notRequired()
      .test("strong-password", passwordPolicyMessage, value => {
        if (!value) return true;
        return strongPasswordRegex.test(value);
      })
  });

  const oldUserEmail = user.email;
  
  const {
    email,
    username,
    phone,
    password,
    profile,
    name,
    queueIds = [],
    serviceIds = [],
    startWork,
    endWork,
    farewellMessage,
    whatsappId,
    allTicket,
    defaultTheme,
    defaultMenu,
    allowGroup,
    allHistoric,
    allUserChat,
    userClosePendingTicket,
    showDashboard,
    allowConnections,
    defaultTicketsManagerWidth = 550,
    allowRealTime,
    profileImage,
    userType,
    workDays,
    lunchStart,
    lunchEnd
  } = userData;

  const normalizedEmail = email !== undefined ? normalizeEmail(email) : undefined;
  const normalizedUsername = username !== undefined ? normalizeUsername(username) : undefined;
  const normalizedPhone = phone !== undefined ? normalizePhone(phone) : undefined;

  if (!isValidUsername(normalizedUsername)) {
    throw new AppError("Usuario deve ter 3 a 40 caracteres e usar apenas letras, numeros, ponto, hifen ou underline.");
  }

  try {
    await schema.validate({ email: normalizedEmail, username: normalizedUsername, phone: normalizedPhone, password, profile, name });
    await ensureUserIdentifierIsAvailable({
      email: normalizedEmail,
      username: normalizedUsername,
      phone: normalizedPhone,
      companyId: user.companyId,
      exceptUserId: user.id
    });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const updatePayload: any = {
    password,
    profile,
    name,
    startWork,
    endWork,
    farewellMessage,
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
    profileImage,
    allowConnections,
    userType,
    workDays,
    lunchStart: lunchStart || null,
    lunchEnd: lunchEnd || null
  };

  if (normalizedEmail) {
    updatePayload.email = normalizedEmail;
  }

  if (username !== undefined) {
    updatePayload.username = normalizedUsername || null;
  }

  if (phone !== undefined) {
    updatePayload.phone = normalizedPhone || null;
  }

  await user.update(updatePayload);

  await user.$set("queues", queueIds);

  // Atualizar serviços vinculados
  if (serviceIds !== undefined) {
    await user.$set("services", serviceIds);
  }

  await user.reload();

  const company = await Company.findByPk(user.companyId);

  if (company.email === oldUserEmail) {
    await company.update({
      email: user.email,
      password
    })
  }
  
  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    phone: user.phone,
    profile: user.profile,
    companyId: user.companyId,
    company,
    queues: user.queues,
    services: user.services,
    startWork: user.startWork,
    endWork: user.endWork,
    greetingMessage: user.farewellMessage,
    allTicket: user.allTicket,
    defaultMenu: user.defaultMenu,
    defaultTheme: user.defaultTheme,
    allowGroup: user.allowGroup,
    allHistoric: user.allHistoric,
    userClosePendingTicket: user.userClosePendingTicket,
    showDashboard: user.showDashboard,
    defaultTicketsManagerWidth: user.defaultTicketsManagerWidth,
    allowRealTime: user.allowRealTime,
    allowConnections: user.allowConnections,
    profileImage: user.profileImage,
    userType: user.userType,
    workDays: user.workDays,
    lunchStart: user.lunchStart,
    lunchEnd: user.lunchEnd
  };

  return serializedUser;
};

export default UpdateUserService;
