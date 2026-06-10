import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const defaultDealsFile = join(process.env.RENDER_DISK_PATH || process.cwd(), "deals.json");

export const categoryColors = {
  Fashion: "#e7e2f2",
  Food: "#efe1cb",
  Home: "#f7e5d8",
  Tech: "#d9eee5",
  Toys: "#fff2d8",
  Travel: "#dbe9f6",
};

export function feedUrlsFromEnv() {
  return (process.env.DEAL_FEED_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

export function numberFrom(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number(value.replace(/[^0-9.]/g, ""));
}

export function discountFor(deal) {
  return Math.round(((deal.listPrice - deal.salePrice) / deal.listPrice) * 100);
}

export function scoreFor(deal) {
  const urgencyBoost = Math.max(0, 24 - deal.expiresInHours);
  return Math.min(99, Math.round(discountFor(deal) * 1.25 + urgencyBoost * 1.7));
}

export function inferCategory(raw) {
  const text = `${raw.category || ""} ${raw.title || raw.name || ""}`.toLowerCase();

  if (text.includes("lego") || text.includes("toy")) return "Toys";
  if (text.includes("flight") || text.includes("hotel") || text.includes("travel")) return "Travel";
  if (text.includes("shoe") || text.includes("shirt") || text.includes("fashion")) return "Fashion";
  if (text.includes("coffee") || text.includes("food") || text.includes("snack")) return "Food";
  if (text.includes("monitor") || text.includes("controller") || text.includes("soundbar") || text.includes("graphics")) {
    return "Tech";
  }

  return raw.category || "Home";
}

export function normalizeDeal(raw, index) {
  const title = String(raw.title || raw.name || "").trim();
  const merchant = String(raw.merchant || raw.store || raw.retailer || "Retailer").trim();
  const salePrice = numberFrom(raw.salePrice ?? raw.price ?? raw.currentPrice);
  const listPrice = numberFrom(raw.listPrice ?? raw.wasPrice ?? raw.rrp ?? raw.originalPrice);
  const expiresInHours = Number(raw.expiresInHours ?? raw.hoursLeft ?? 72);
  const url = String(raw.url || raw.link || raw.dealUrl || "").trim();
  const category = inferCategory(raw);

  if (!title || !url || !Number.isFinite(salePrice) || !Number.isFinite(listPrice)) return null;
  if (salePrice <= 0 || listPrice <= salePrice || expiresInHours <= 0) return null;

  const deal = {
    id: raw.id || Date.now() + index,
    title,
    merchant,
    category,
    salePrice,
    listPrice,
    expiresInHours,
    stock: String(raw.stock || raw.status || "Deal available").trim(),
    color: raw.color || categoryColors[category] || "#dfe6ea",
    url,
    imageUrl: String(raw.imageUrl || raw.image || raw.thumbnail || raw.image_url || "").trim(),
    importedAt: new Date().toISOString(),
  };

  return discountFor(deal) >= Number(process.env.MIN_IMPORT_DISCOUNT || 15) ? deal : null;
}

export function extractDeals(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.deals)) return payload.deals;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.products)) return payload.products;
  return [];
}

export async function readDealsFile(dealsFile) {
  try {
    const deals = JSON.parse(await readFile(dealsFile, "utf8"));
    return Array.isArray(deals) ? deals : [];
  } catch {
    return [];
  }
}

export async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "DealFinder/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return extractDeals(await response.json());
}

export function dealKey(deal) {
  return `${deal.merchant}:${deal.title}`.toLowerCase().replace(/\s+/g, " ").trim();
}

export function mergeDeals(existingDeals, importedDeals) {
  const merged = new Map();

  [...existingDeals, ...importedDeals].forEach((deal) => {
    if (!deal || !deal.title || !deal.url) return;
    const key = dealKey(deal);
    const current = merged.get(key) || {};
    merged.set(key, { ...current, ...deal });
  });

  return [...merged.values()]
    .filter((deal) => deal.expiresInHours > 0 && discountFor(deal) >= 10)
    .sort((a, b) => scoreFor(b) - scoreFor(a))
    .slice(0, Number(process.env.MAX_DEALS || 60));
}

export async function writeDealsFile(dealsFile, nextDeals) {
  await mkdir(dirname(dealsFile), { recursive: true });
  await writeFile(dealsFile, `${JSON.stringify(nextDeals, null, 2)}\n`);
}

export async function importDeals({ dealsFile = defaultDealsFile, existingDeals = [], fallbackDeals = [] } = {}) {
  const feedUrls = feedUrlsFromEnv();
  const feedResults = await Promise.allSettled(feedUrls.map(fetchFeed));
  const importedRawDeals = feedResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const importedDeals = importedRawDeals.map(normalizeDeal).filter(Boolean);
  const currentDeals = existingDeals.length ? existingDeals : await readDealsFile(dealsFile);
  const nextDeals = mergeDeals(currentDeals.length ? currentDeals : fallbackDeals, importedDeals);

  await writeDealsFile(dealsFile, nextDeals);

  return {
    feedsChecked: feedUrls.length,
    feedErrors: feedResults.filter((result) => result.status === "rejected").length,
    errors: feedResults.filter((result) => result.status === "rejected").map((result) => result.reason.message),
    imported: importedDeals.length,
    saved: nextDeals.length,
    deals: nextDeals,
    dealsFile,
  };
}
