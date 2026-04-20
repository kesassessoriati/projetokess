import axios from "axios";
import AppError from "../../errors/AppError";
import { resolveFirecrawlApiKey } from "./FirecrawlConfigService";

interface SearchInternetLeadsRequest {
  companyId: number;
  userId: number;
  niche: string;
  city?: string;
  state?: string;
  country?: string;
  maxResults?: number;
}

export interface InternetLeadCandidate {
  id: string;
  title: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  description: string;
  sourceUrl: string;
  sourceDomain: string;
}

type FirecrawlSearchItem = Record<string, any>;

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX =
  /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-\s]?\d{4})/g;
const ADDRESS_LINE_REGEX =
  /\b(?:rua|av\.?|avenida|travessa|alameda|rodovia|estrada|pra[çc]a)\b/i;

const buildQuery = ({
  niche,
  city,
  state,
  country
}: SearchInternetLeadsRequest): string => {
  const tokens = [
    niche,
    city,
    state,
    country,
    "telefone email site contato empresa"
  ]
    .map(value => String(value || "").trim())
    .filter(Boolean);

  return tokens.join(" ");
};

const normalizeResultsArray = (payload: any): FirecrawlSearchItem[] => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.web)) return payload.web;
  return [];
};

const normalizeScrapeMarkdown = (payload: any): string => {
  if (typeof payload?.data?.markdown === "string") return payload.data.markdown;
  if (typeof payload?.markdown === "string") return payload.markdown;
  return "";
};

const normalizeUrl = (item: FirecrawlSearchItem): string => {
  return (
    item.url ||
    item.sourceUrl ||
    item.metadata?.sourceURL ||
    item.metadata?.url ||
    ""
  );
};

const normalizeTitle = (item: FirecrawlSearchItem, fallbackUrl: string): string => {
  const rawTitle =
    item.title ||
    item.metadata?.title ||
    item.metadata?.ogTitle ||
    item.sourceTitle ||
    fallbackUrl;

  return String(rawTitle || "")
    .replace(/\s+\|\s+.+$/, "")
    .replace(/\s+-\s+.+$/, "")
    .trim();
};

const pickFirstMatch = (content: string, regex: RegExp): string => {
  const matches = content.match(regex) || [];
  return matches[0] ? String(matches[0]).trim() : "";
};

const cleanPhone = (value: string): string => {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    return `55${digits}`;
  }

  return digits;
};

const extractAddress = (content: string): string => {
  const lines = String(content || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const line = lines.find(currentLine => ADDRESS_LINE_REGEX.test(currentLine));
  return line || "";
};

const extractDescription = (item: FirecrawlSearchItem, markdown: string): string => {
  const description =
    item.description ||
    item.metadata?.description ||
    item.snippet ||
    markdown
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(" ");

  return String(description || "").slice(0, 320);
};

const scrapeFallbackMarkdown = async (
  apiKey: string,
  url: string
): Promise<string> => {
  if (!url) return "";

  const response = await axios.post(
    `${FIRECRAWL_BASE_URL}/scrape`,
    {
      url,
      formats: ["markdown"],
      onlyMainContent: true
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );

  return normalizeScrapeMarkdown(response.data);
};

const enrichResult = async (
  apiKey: string,
  item: FirecrawlSearchItem,
  index: number
): Promise<InternetLeadCandidate | null> => {
  const sourceUrl = normalizeUrl(item);

  if (!sourceUrl) {
    return null;
  }

  let markdown = typeof item.markdown === "string" ? item.markdown : "";

  if (!markdown) {
    try {
      markdown = await scrapeFallbackMarkdown(apiKey, sourceUrl);
    } catch (_error) {
      markdown = "";
    }
  }

  const content = `${markdown}\n${item.description || ""}\n${item.title || ""}`;
  const email = pickFirstMatch(content, EMAIL_REGEX);
  const phone = cleanPhone(pickFirstMatch(content, PHONE_REGEX));
  const address = extractAddress(content);
  const sourceDomain = (() => {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch (_error) {
      return sourceUrl;
    }
  })();

  const title = normalizeTitle(item, sourceDomain);
  const description = extractDescription(item, markdown);
  const companyName = title || sourceDomain;

  return {
    id: `${sourceDomain}-${index}`,
    title,
    companyName,
    contactName: "",
    email,
    phone,
    website: sourceUrl,
    address,
    city: "",
    state: "",
    description,
    sourceUrl,
    sourceDomain
  };
};

const uniqueBySource = (items: InternetLeadCandidate[]): InternetLeadCandidate[] => {
  const seen = new Set<string>();

  return items.filter(item => {
    const key = `${item.sourceUrl}|${item.email}|${item.phone}|${item.companyName}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const SearchInternetLeadsService = async ({
  companyId,
  userId,
  niche,
  city,
  state,
  country,
  maxResults = 5
}: SearchInternetLeadsRequest): Promise<{
  source: "personal" | "global";
  query: string;
  items: InternetLeadCandidate[];
}> => {
  const trimmedNiche = String(niche || "").trim();

  if (!trimmedNiche) {
    throw new AppError("Informe o nicho que deseja buscar.", 400);
  }

  const safeLimit = Math.max(1, Math.min(Number(maxResults) || 5, 10));
  const { apiKey, source } = await resolveFirecrawlApiKey(companyId, userId);
  const query = buildQuery({ niche: trimmedNiche, city, state, country, companyId, userId, maxResults });

  const response = await axios.post(
    `${FIRECRAWL_BASE_URL}/search`,
    {
      query,
      limit: safeLimit,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true
      }
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );

  const rawResults = normalizeResultsArray(response.data);

  const enriched = await Promise.all(
    rawResults.slice(0, safeLimit).map((item, index) =>
      enrichResult(apiKey, item, index)
    )
  );

  return {
    source,
    query,
    items: uniqueBySource(enriched.filter(Boolean) as InternetLeadCandidate[])
  };
};

export default SearchInternetLeadsService;
