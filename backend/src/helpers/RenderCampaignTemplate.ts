import Mustache from "mustache";
import { date, hour, msgsd } from "./Mustache";

type ContactLike = {
  name?: string | null;
  email?: string | null;
  number?: string | null;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getFirstName = (name?: string | null): string => {
  const safeName = String(name || "").trim();
  return safeName ? safeName.split(" ")[0] : "";
};

const buildTemplateView = (
  contact?: ContactLike | null,
  variables: Array<{ key?: string; value?: any }> = []
) => {
  const name = String(contact?.name || "").trim();
  const email = String(contact?.email || "").trim();
  const number = String(contact?.number || "").trim();
  const greeting = msgsd();
  const today = date();
  const now = hour();

  const customVariables = (variables || []).reduce<Record<string, any>>(
    (acc, item) => {
      const key = String(item?.key || "").trim();
      if (!key) return acc;
      acc[key] = item?.value ?? "";
      return acc;
    },
    {}
  );

  return {
    firstName: getFirstName(name),
    name,
    contactName: name,
    email,
    number,
    ms: greeting,
    greeting,
    saudacao: greeting,
    date: today,
    data: today,
    hour: now,
    hora: now,
    data_hora: `${today} às ${now}`,
    nome: name,
    numero: number,
    ...customVariables
  };
};

const replaceLegacyTokens = (
  template: string,
  view: Record<string, any>
): string => {
  let rendered = template;

  Object.entries(view).forEach(([key, value]) => {
    const safeValue = value == null ? "" : String(value);
    rendered = rendered.replace(
      new RegExp(`\\{${escapeRegExp(key)}\\}`, "g"),
      safeValue
    );
  });

  return rendered;
};

const renderTemplateString = (
  template: string,
  contact?: ContactLike | null,
  variables: Array<{ key?: string; value?: any }> = []
): string => {
  const view = buildTemplateView(contact, variables);
  const mustacheRendered = Mustache.render(String(template || ""), view);
  return replaceLegacyTokens(mustacheRendered, view);
};

export const renderCampaignTemplate = <T = any>(
  value: T,
  contact?: ContactLike | null,
  variables: Array<{ key?: string; value?: any }> = []
): T => {
  if (typeof value === "string") {
    return renderTemplateString(value, contact, variables) as T;
  }

  if (Array.isArray(value)) {
    return value.map(item =>
      renderCampaignTemplate(item, contact, variables)
    ) as T;
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, any>).reduce<
      Record<string, any>
    >((acc, [key, item]) => {
      acc[key] = renderCampaignTemplate(item, contact, variables);
      return acc;
    }, {}) as T;
  }

  return value;
};

export default renderCampaignTemplate;
