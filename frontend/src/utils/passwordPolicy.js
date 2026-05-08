export const passwordPolicyMessage =
  "A senha deve ter no minimo 8 caracteres, uma letra maiuscula, uma letra minuscula, um numero e um caractere especial.";

export const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const passwordChecks = [
  {
    label: "Minimo 8 caracteres",
    test: (value = "") => value.length >= 8
  },
  {
    label: "Ao menos 1 letra maiuscula",
    test: (value = "") => /[A-Z]/.test(value)
  },
  {
    label: "Ao menos 1 letra minuscula",
    test: (value = "") => /[a-z]/.test(value)
  },
  {
    label: "Ao menos 1 numero",
    test: (value = "") => /\d/.test(value)
  },
  {
    label: "Ao menos 1 caractere especial, ex: @",
    test: (value = "") => /[^A-Za-z0-9]/.test(value)
  }
];
