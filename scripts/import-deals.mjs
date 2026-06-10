import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = process.cwd();
const dealsFile = process.env.DEALS_FILE || join(process.env.RENDER_DISK_PATH || root, "deals.json");
const feedUrls = (process.env.DEAL_FEED_URLS || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const categoryColors = {
  Fashion: "#e7e2f2",
  Food: "#efe1cb",
  Home: "#f7e5d8",
  Tech: "#d9eee5",
  Toys: "#fff2d8",
  Travel: "#dbe9f6",
};

const fallbackDeals = [
  {
    id: 1,
    title: "PlayStation DualSense Wireless Controller",
    merchant: "Amazon UK",
    category: "Tech",
    salePrice: 44.99,
    listPrice: 64.99,
    expiresInHours: 408,
    stock: "Popular gaming deal",
    color: "#dfe6ea",
    url: "https://www.amazon.co.uk/s?k=PlayStation+DualSense+Wireless+Controller",
  },
  {
    id: 2,
    title: "Ninja SLUSHi Frozen Drinks Maker",
    merchant: "Amazon UK",
    category: "Home",
    salePrice: 199,
    listPrice: 299.99,
    expiresInHours: 408,
    stock: "Kitchen appliance watch",
    color: "#f7e5d8",
    url: "https://www.amazon.co.uk/s?k=Ninja+SLUSHi+Frozen+Drinks+Maker",
  },
  {
    id: 3,
    title: "Oral-B iO2 Electric Toothbrush",
    merchant: "Amazon UK",
    category: "Home",
    salePrice: 44.99,
    listPrice: 100,
    expiresInHours: 408,
    stock: "Health and grooming pick",
    color: "#f5dfda",
    url: "https://www.amazon.co.uk/s?k=Oral-B+iO2+Electric+Toothbrush",
  },
  {
    id: 4,
    title: "MSI Pro MP223 22-inch Full HD Monitor",
    merchant: "Amazon UK",
    category: "Tech",
    salePrice: 48.95,
    listPrice: 69,
    expiresInHours: 408,
    stock: "Home office deal",
    color: "#d9eee5",
    url: "https://www.amazon.co.uk/s?k=MSI+Pro+MP223+22-inch+Full+HD+Monitor",
  },
  {
    id: 5,
    title: "LEGO Speed Champions F1 Car Sets",
    merchant: "Amazon UK",
    category: "Toys",
    salePrice: 21.99,
    listPrice: 29.99,
    expiresInHours: 408,
    stock: "Gift deal watch",
    color: "#fff2d8",
    url: "https://www.amazon.co.uk/s?k=LEGO+Speed+Champions+F1",
  },
  {
    id: 6,
    title: "Ninja Double Stack XL Air Fryer",
    merchant: "Amazon UK",
    category: "Home",
    salePrice: 205,
    listPrice: 269.99,
    expiresInHours: 408,
    stock: "Kitchen bestseller watch",
    color: "#dbe9f6",
    url: "https://www.amazon.co.uk/s?k=Ninja+Double+Stack+XL+Air+Fryer",
  },
];

function numberFrom(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number(value.replace(/[^0-9.]/g, ""));
}

function discountFor(deal) {
  return Math.round(((deal.listPrice - deal.salePrice) / deal.listPrice) * 100);
}

function scoreFor(deal) {
  const urgencyBoost = Math.max(0, 24 - deal.expiresInHours);
  return Math.min(99, Math.round(discountFor(deal) * 1.25 + urgencyBoost * 1.7));
}

function inferCategory(raw) {
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

function normalizeDeal(raw, index) {
  const title = String(raw.title || raw.name || "").trim();
  const merchant = String(raw.merchant || raw.store || raw.retailer || "Retailer").trim();
  const salePrice = numberFrom(raw.salePrice ?? raw.price ?? raw.currentPrice);
  const listPrice = numberFrom(raw.listPrice ?? raw.wasPrice ?? raw.rrp ?? raw.originalPrice);
  const expiresInHours = Number(raw.expiresInHours ?? raw.hoursLeft ?? 72);
  const url = String(raw.url || raw.link || raw.dealUrl || "").trim();
  const category = inferCategory(raw);

  if (!title || !url || !Number.isFinite(salePrice) || !Number.isFinite(listPrice)) {
    return null;
  }

  if (salePrice <= 0 || listPrice <= salePrice || expiresInHours <= 0) {
    return null;
  }

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
    importedAt: new Date().toISOString(),
  };

  return discountFor(deal) >= Number(process.env.MIN_IMPORT_DISCOUNT || 15) ? deal : null;
}

function extractDeals(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.deals)) return payload.deals;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.products)) return payload.products;
  return [];
}

async function loadExistingDeals() {
  try {
    const deals = JSON.parse(await readFile(dealsFile, "utf8"));
    return Array.isArray(deals) ? deals : [];
  } catch {
    return [];
  }
}

async function fetchFeed(url) {
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

function dealKey(deal) {
  return `${deal.merchant}:${deal.title}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function mergeDeals(existingDeals, importedDeals) {
  const merged = new Map();

  [...importedDeals, ...existingDeals].forEach((deal) => {
    if (!deal || !deal.title || !deal.url) return;
    merged.set(dealKey(deal), deal);
  });

  return [...merged.values()]
    .filter((deal) => deal.expiresInHours > 0 && discountFor(deal) >= 10)
    .sort((a, b) => scoreFor(b) - scoreFor(a))
    .slice(0, Number(process.env.MAX_DEALS || 60));
}

async function saveDeals(nextDeals) {
  await mkdir(dirname(dealsFile), { recursive: true });
  await writeFile(dealsFile, `${JSON.stringify(nextDeals, null, 2)}\n`);
}

const existingDeals = await loadExistingDeals();
const feedResults = await Promise.allSettled(feedUrls.map(fetchFeed));
const importedRawDeals = feedResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
const importedDeals = importedRawDeals.map(normalizeDeal).filter(Boolean);
const nextDeals = mergeDeals(existingDeals.length ? existingDeals : fallbackDeals, importedDeals);

await saveDeals(nextDeals);

console.log(
  JSON.stringify(
    {
      feedsChecked: feedUrls.length,
      feedErrors: feedResults.filter((result) => result.status === "rejected").length,
      imported: importedDeals.length,
      saved: nextDeals.length,
      dealsFile,
    },
    null,
    2,
  ),
);
