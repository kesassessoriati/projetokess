const PASSWORD_POLICY_MESSAGE =
  "A senha deve ter no minimo 8 caracteres, uma letra maiuscula, uma letra minuscula, um numero e um caractere especial.";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const isStrongPassword = (password?: string | null): boolean =>
  strongPasswordRegex.test(String(password || ""));

export const passwordPolicyMessage = PASSWORD_POLICY_MESSAGE;

export default strongPasswordRegex;
