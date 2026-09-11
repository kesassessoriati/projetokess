export const asMinorUnits = (value) => {
  const raw = String(value || "").trim();
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = `${whole}${fraction.padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
  return /^\d+$/.test(minor) && BigInt(minor) > BigInt(0) ? minor : null;
};

export const formatMinorCurrency = (minorValue, currency) => {
  const minor = String(minorValue ?? "");
  if (!/^\d+$/.test(minor)) return "—";
  const value = BigInt(minor);
  const whole = value / BigInt(100);
  const fraction = String(value % BigInt(100)).padStart(2, "0");
  return `${currency || "BRL"} ${new Intl.NumberFormat("pt-BR").format(whole)},${fraction}`;
};
