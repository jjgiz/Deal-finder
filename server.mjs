import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { importDeals, mergeDeals, normalizeDeal } from "./lib/deal-importer.mjs";

const port = process.env.PORT || 4173;
const root = process.cwd();
const dealsFile = process.env.DEALS_FILE || join(process.env.RENDER_DISK_PATH || root, "deals.json");
const leadsFile = process.env.LEADS_FILE || join(process.env.RENDER_DISK_PATH || root, "leads.json");
const clickFile = process.env.CLICK_FILE || join(process.env.RENDER_DISK_PATH || root, "clicks.json");
const amazonAssociateTag = process.env.AMAZON_ASSOCIATE_TAG || "";
const awinPublisherId = process.env.AWIN_PUBLISHER_ID || "";
const awinAdvertiserId = process.env.AWIN_ADVERTISER_ID || "";
const importIntervalMinutes = Number(process.env.IMPORT_INTERVAL_MINUTES || 360);
const clients = new Set();

const defaultDeals = [
  {
    id: 1,
    title: "PlayStation DualSense Wireless Controller",
    merchant: "Amazon UK",
    category: "Tech",
    salePrice: 44.99,
    listPrice: 64.99,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
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
    stock: "Early Prime Day coverage",
    color: "#f7e5d8",
    url: "https://www.amazon.co.uk/s?k=Ninja+SLUSHi+Frozen+Drinks+Maker",
  },
  {
    id: 3,
    title: "Livento Cordless Strimmer",
    merchant: "Amazon UK",
    category: "Home",
    salePrice: 54.99,
    listPrice: 103.99,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
    color: "#d9eee5",
    url: "https://www.amazon.co.uk/s?k=Livento+Cordless+Strimmer",
  },
  {
    id: 4,
    title: "Oral-B iO2 Electric Toothbrush",
    merchant: "Amazon UK",
    category: "Home",
    salePrice: 44.99,
    listPrice: 100,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
    color: "#f5dfda",
    url: "https://www.amazon.co.uk/s?k=Oral-B+iO2+Electric+Toothbrush",
  },
  {
    id: 5,
    title: "Sonos Beam Gen 2 Soundbar",
    merchant: "Amazon UK",
    category: "Tech",
    salePrice: 359,
    listPrice: 449,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
    color: "#dbe9f6",
    url: "https://www.amazon.co.uk/s?k=Sonos+Beam+Gen+2+Soundbar",
  },
  {
    id: 6,
    title: "MSI GeForce RTX 5060 Ti Graphics Card",
    merchant: "Amazon UK",
    category: "Tech",
    salePrice: 279.98,
    listPrice: 359.99,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
    color: "#e7e2f2",
    url: "https://www.amazon.co.uk/s?k=MSI+GeForce+RTX+5060+Ti",
  },
  {
    id: 7,
    title: "Duracell Plus AA Batteries 36 Pack",
    merchant: "Amazon UK",
    category: "Home",
    salePrice: 22.38,
    listPrice: 29.99,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
    color: "#fff2d8",
    url: "https://www.amazon.co.uk/s?k=Duracell+Plus+AA+Batteries+36+Pack",
  },
  {
    id: 8,
    title: "Ninja Double Stack XL Air Fryer",
    merchant: "Amazon UK",
    category: "Home",
    salePrice: 205,
    listPrice: 269.99,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
    color: "#f7e5d8",
    url: "https://www.amazon.co.uk/s?k=Ninja+Double+Stack+XL+Air+Fryer",
  },
  {
    id: 9,
    title: "Philips OneBlade 360",
    merchant: "Amazon UK",
    category: "Home",
    salePrice: 42.99,
    listPrice: 54.99,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
    color: "#d9eee5",
    url: "https://www.amazon.co.uk/s?k=Philips+OneBlade+360",
  },
  {
    id: 10,
    title: "MSI Pro MP223 22-inch Full HD Monitor",
    merchant: "Amazon UK",
    category: "Tech",
    salePrice: 48.95,
    listPrice: 69,
    expiresInHours: 408,
    stock: "Early Prime Day coverage",
    color: "#dfe6ea",
    url: "https://www.amazon.co.uk/s?k=MSI+Pro+MP223+22-inch+Full+HD+Monitor",
  },
  {
    id: 11,
    title: "LEGO Game Boy Display Set",
    merchant: "Amazon UK",
    category: "Toys",
    salePrice: 41.99,
    listPrice: 54.99,
    expiresInHours: 408,
    stock: "LEGO gaming deal watch",
    color: "#fff2d8",
    url: "https://www.amazon.co.uk/s?k=LEGO+Game+Boy",
  },
  {
    id: 12,
    title: "LEGO Technic NASA Artemis Space Launch System",
    merchant: "Argos",
    category: "Toys",
    salePrice: 55,
    listPrice: 69.99,
    expiresInHours: 408,
    stock: "Space LEGO deal watch",
    color: "#dbe9f6",
    url: "https://www.argos.co.uk/search/lego-technic-nasa-artemis/",
  },
  {
    id: 13,
    title: "LEGO Speed Champions F1 Car Sets",
    merchant: "Amazon UK",
    category: "Toys",
    salePrice: 21.99,
    listPrice: 29.99,
    expiresInHours: 408,
    stock: "Prime Day LEGO watch",
    color: "#e7e2f2",
    url: "https://www.amazon.co.uk/s?k=LEGO+Speed+Champions+F1",
  },
  {
    id: 14,
    title: "LEGO Botanicals Flower Sets",
    merchant: "Amazon UK",
    category: "Toys",
    salePrice: 39.99,
    listPrice: 49.99,
    expiresInHours: 408,
    stock: "Gift LEGO deal watch",
    color: "#f5dfda",
    url: "https://www.amazon.co.uk/s?k=LEGO+Botanicals",
  },
];

async function loadBundledFeedDeals() {
  try {
    const feed = JSON.parse(await readFile(join(root, "sample-deal-feed.json"), "utf8"));
    const rawDeals = Array.isArray(feed) ? feed : feed.deals || feed.items || feed.products || [];
    return rawDeals.map(normalizeDeal).filter(Boolean);
  } catch (error) {
    console.warn(`Could not load bundled feed deals: ${error.message}`);
    return [];
  }
}

async function loadDeals() {
  const bundledDeals = await loadBundledFeedDeals();

  try {
    const savedDeals = JSON.parse(await readFile(dealsFile, "utf8"));

    if (Array.isArray(savedDeals) && savedDeals.length > 0) {
      const mergedDeals = mergeDeals(savedDeals, bundledDeals);

      if (mergedDeals.length > savedDeals.length) {
        await saveDeals(mergedDeals);
      }

      return mergedDeals;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not read ${dealsFile}; using default deals.`);
    }
  }

  console.warn(`No saved deals found in ${dealsFile}; seeding default deals.`);
  const seededDeals = mergeDeals(defaultDeals, bundledDeals);
  await saveDeals(seededDeals);
  return seededDeals;
}

async function saveDeals(nextDeals) {
  await mkdir(dirname(dealsFile), { recursive: true });
  await writeFile(dealsFile, `${JSON.stringify(nextDeals, null, 2)}\n`);
}

let deals = await loadDeals();

async function readList(filePath) {
  try {
    const data = JSON.parse(await readFile(filePath, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not read ${filePath}; starting with an empty list.`);
    }

    return [];
  }
}

async function writeList(filePath, items) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`);
}

const categoryColors = {
  Fashion: "#e7e2f2",
  Food: "#efe1cb",
  Home: "#f7e5d8",
  Tech: "#d9eee5",
  Toys: "#fff2d8",
  Travel: "#dbe9f6",
};

const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

function sendJson(response, data) {
  response.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function notFound(response) {
  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
}

function enrichDealUrl(deal) {
  if (awinPublisherId && awinAdvertiserId) {
    const url = new URL("https://www.awin1.com/cread.php");
    url.searchParams.set("awinmid", awinAdvertiserId);
    url.searchParams.set("awinaffid", awinPublisherId);
    url.searchParams.set("ued", deal.url);
    return url.toString();
  }

  if (!amazonAssociateTag || !deal.url.includes("amazon.co.uk")) {
    return deal.url;
  }

  const url = new URL(deal.url);
  url.searchParams.set("tag", amazonAssociateTag);
  return url.toString();
}

function summarizeClicks(clicks) {
  const byDeal = new Map();

  clicks.forEach((click) => {
    const current = byDeal.get(click.dealId) || {
      dealId: click.dealId,
      title: click.title,
      merchant: click.merchant,
      clicks: 0,
    };

    current.clicks += 1;
    byDeal.set(click.dealId, current);
  });

  return [...byDeal.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
}

function summarizeCategories() {
  const byCategory = new Map();

  deals.forEach((deal) => {
    const current = byCategory.get(deal.category) || {
      category: deal.category,
      deals: 0,
      averageDiscount: 0,
    };

    current.deals += 1;
    current.averageDiscount += Math.round(((deal.listPrice - deal.salePrice) / deal.listPrice) * 100);
    byCategory.set(deal.category, current);
  });

  return [...byCategory.values()]
    .map((item) => ({
      ...item,
      averageDiscount: item.deals ? Math.round(item.averageDiscount / item.deals) : 0,
    }))
    .sort((a, b) => b.deals - a.deals);
}

function broadcastDeals() {
  const payload = `data: ${JSON.stringify(deals)}\n\n`;
  clients.forEach((client) => client.write(payload));
}

async function importLiveDeals() {
  const result = await importDeals({
    dealsFile,
    existingDeals: deals,
    fallbackDeals: defaultDeals,
  });

  deals = result.deals;
  broadcastDeals();

  const { deals: importedDealList, ...summary } = result;
  console.log(`Deal import finished: ${JSON.stringify(summary)}`);
  return summary;
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isValidDeal(deal) {
  return (
    deal &&
    typeof deal.title === "string" &&
    typeof deal.merchant === "string" &&
    typeof deal.category === "string" &&
    Number.isFinite(deal.salePrice) &&
    Number.isFinite(deal.listPrice) &&
    Number.isFinite(deal.expiresInHours) &&
    deal.salePrice >= 0 &&
    deal.listPrice > deal.salePrice &&
    deal.expiresInHours > 0
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function serveStatic(request, response) {
  const requestedPath = new URL(request.url, `http://${request.headers.host}`).pathname;
  const safePath = normalize(requestedPath === "/" ? "/index.html" : requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);
  const extension = extname(filePath);

  try {
    await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[extension] || "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/api/deals" && request.method === "GET") {
    sendJson(response, deals);
    return;
  }

  if (requestUrl.pathname === "/api/deals" && request.method === "POST") {
    try {
      const deal = await readJson(request);

      if (!isValidDeal(deal)) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Invalid deal" }));
        return;
      }

      const savedDeal = {
        id: Date.now(),
        title: deal.title.trim(),
        merchant: deal.merchant.trim(),
        category: deal.category,
        salePrice: deal.salePrice,
        listPrice: deal.listPrice,
        expiresInHours: deal.expiresInHours,
        stock: String(deal.stock || "In stock").trim(),
        color: categoryColors[deal.category] || "#dfe6ea",
        url: String(deal.url || "").trim(),
      };

      deals = [savedDeal, ...deals];
      await saveDeals(deals);
      broadcastDeals();
      sendJson(response, savedDeal);
    } catch {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    return;
  }

  if (requestUrl.pathname === "/api/deals/live") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });

    response.write(`data: ${JSON.stringify(deals)}\n\n`);
    clients.add(response);
    request.on("close", () => clients.delete(response));
    return;
  }

  if (requestUrl.pathname === "/api/admin/metrics" && request.method === "GET") {
    const clicks = await readList(clickFile);
    const leads = await readList(leadsFile);

    sendJson(response, {
      dealCount: deals.length,
      leadCount: leads.length,
      clickCount: clicks.length,
      topDeals: summarizeClicks(clicks),
      categories: summarizeCategories(),
    });
    return;
  }

  if (requestUrl.pathname === "/api/admin/import" && request.method === "POST") {
    try {
      sendJson(response, await importLiveDeals());
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: error.message }));
    }

    return;
  }

  if (requestUrl.pathname === "/api/leads" && request.method === "POST") {
    try {
      const lead = await readJson(request);
      const email = String(lead.email || "").trim().toLowerCase();
      const category = String(lead.category || "All").trim();

      if (!isValidEmail(email)) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Invalid email" }));
        return;
      }

      const leads = await readList(leadsFile);
      const existing = leads.find((item) => item.email === email);
      const savedLead = {
        email,
        category,
        source: "deal-alerts",
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await writeList(
        leadsFile,
        existing ? leads.map((item) => (item.email === email ? savedLead : item)) : [savedLead, ...leads],
      );

      sendJson(response, { ok: true });
    } catch {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    return;
  }

  if (requestUrl.pathname === "/out" && request.method === "GET") {
    const dealId = Number(requestUrl.searchParams.get("deal"));
    const deal = deals.find((item) => item.id === dealId);

    if (!deal || !deal.url) {
      notFound(response);
      return;
    }

    const clicks = await readList(clickFile);
    await writeList(clickFile, [
      {
        dealId: deal.id,
        title: deal.title,
        merchant: deal.merchant,
        clickedAt: new Date().toISOString(),
        referrer: request.headers.referer || "",
        userAgent: request.headers["user-agent"] || "",
      },
      ...clicks.slice(0, 999),
    ]);

    response.writeHead(302, {
      Location: enrichDealUrl(deal),
      "Cache-Control": "no-store",
    });
    response.end();
    return;
  }

  serveStatic(request, response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`DealFinder live server running on port ${port}.`);
  console.log("Add deals through the app or POST /api/deals to update connected browsers.");
});

if (process.env.DEAL_FEED_URLS) {
  importLiveDeals().catch((error) => console.warn(`Deal import failed: ${error.message}`));

  setInterval(
    () => {
      importLiveDeals().catch((error) => console.warn(`Deal import failed: ${error.message}`));
    },
    Math.max(15, importIntervalMinutes) * 60 * 1000,
  );
}
