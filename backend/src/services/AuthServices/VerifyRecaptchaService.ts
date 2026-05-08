import axios from "axios";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";

interface Params {
  token?: string;
  remoteIp?: string;
}

const recaptchaEnabled = (): boolean =>
  Boolean((process.env.RECAPTCHA_SECRET_KEY || "").trim());

const VerifyRecaptchaService = async ({
  token,
  remoteIp
}: Params): Promise<void> => {
  const secret = (process.env.RECAPTCHA_SECRET_KEY || "").trim();

  if (!secret) {
    return;
  }

  if (!token || typeof token !== "string") {
    throw new AppError("ERR_RECAPTCHA_REQUIRED", 400);
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);
    if (remoteIp) params.append("remoteip", remoteIp);

    const { data } = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 5000
      }
    );

    if (!data?.success) {
      logger.warn("reCAPTCHA verification failed", {
        errorCodes: data?.["error-codes"]
      });
      throw new AppError("ERR_RECAPTCHA_INVALID", 400);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;

    logger.error(`reCAPTCHA verification error: ${error?.message || error}`);
    throw new AppError("ERR_RECAPTCHA_UNAVAILABLE", 503);
  }
};

export { recaptchaEnabled };
export default VerifyRecaptchaService;
