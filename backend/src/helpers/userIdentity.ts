import { Op } from "sequelize";

import AppError from "../errors/AppError";
import User from "../models/User";

export const normalizeEmail = (email?: string): string => {
  return String(email || "").trim().toLowerCase();
};

export const normalizeUsername = (username?: string): string => {
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".");
};

export const normalizePhone = (phone?: string): string => {
  return String(phone || "").replace(/\D/g, "");
};

export const isValidUsername = (username?: string): boolean => {
  if (!username) return true;
  return /^[a-z0-9._-]{3,40}$/.test(username);
};

export const generatedInternalEmailDomain = "internal.atendzappy.local";

export const makeInternalEmail = ({
  username,
  phone,
  companyId
}: {
  username?: string;
  phone?: string;
  companyId?: number;
}): string => {
  const base = normalizeUsername(username) || normalizePhone(phone) || `user-${Date.now()}`;
  const scopedCompany = companyId || "company";
  return `${base}.${scopedCompany}@${generatedInternalEmailDomain}`;
};

export const isInternalEmail = (email?: string): boolean => {
  return normalizeEmail(email).endsWith(`@${generatedInternalEmailDomain}`);
};

export const ensureUserIdentifierIsAvailable = async ({
  email,
  username,
  phone,
  companyId,
  exceptUserId
}: {
  email?: string;
  username?: string;
  phone?: string;
  companyId?: number;
  exceptUserId?: number | string;
}): Promise<void> => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);
  const normalizedPhone = normalizePhone(phone);
  const idFilter = exceptUserId ? { id: { [Op.ne]: exceptUserId } } : {};

  if (normalizedEmail) {
    const emailExists = await User.findOne({
      where: {
        ...idFilter,
        email: normalizedEmail
      }
    });

    if (emailExists) {
      throw new AppError("ERR_USER_EMAIL_ALREADY_EXISTS");
    }
  }

  if (companyId && normalizedUsername) {
    const usernameExists = await User.findOne({
      where: {
        ...idFilter,
        companyId,
        username: normalizedUsername
      }
    });

    if (usernameExists) {
      throw new AppError("ERR_USER_USERNAME_ALREADY_EXISTS");
    }
  }

  if (companyId && normalizedPhone) {
    const phoneExists = await User.findOne({
      where: {
        ...idFilter,
        companyId,
        phone: normalizedPhone
      }
    });

    if (phoneExists) {
      throw new AppError("ERR_USER_PHONE_ALREADY_EXISTS");
    }
  }
};
