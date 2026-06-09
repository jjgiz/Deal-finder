import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = process.env.PORT || 4173;
const root = process.cwd();
const clients = new Set();

let deals = [
  {
    id: 1,
    title: "Sony WH-1000XM5 Noise Cancelling Headphones",
    merchant: "TechNest",
    category: "Tech",
    salePrice: 279,
    listPrice: 399,
    expiresInHours: 7,
    stock: "Low stock",
    color: "#d9eee5",
  },
  {
    id: 2,
    title: "Ninja Dual Zone Air Fryer",
    merchant: "HomeCart",
    category: "Home",
    salePrice: 129,
    listPrice: 219,
    expiresInHours: 21,
    stock: "In stock",
    color: "#f7e5d8",
  },
  {
    id: 3,
    title: "London to Barcelona Return Flight",
    merchant: "SkyLoop",
    category: "Travel",
    salePrice: 84,
    listPrice: 176,
    expiresInHours: 12,
    stock: "9 seats",
    color: "#dbe9f6",
  },
  {
    id: 4,
    title: "Adidas Ultraboost Light Running Shoes",
    merchant: "SportStreet",
    category: "Fashion",
    salePrice: 92,
    listPrice: 190,
    expiresInHours: 30,
    stock: "Popular",
    color: "#e7e2f2",
  },
  {
    id: 5,
    title: "Blue Bottle Coffee Subscription",
    merchant: "BeanMarket",
    category: "Food",
    salePrice: 18,
    listPrice: 30,
    expiresInHours: 48,
    stock: "New codes",
    color: "#efe1cb",
  },
  {
    id: 6,
    title: "Apple iPad Air 11-inch 128GB",
    merchant: "GadgetBay",
    category: "Tech",
    salePrice: 499,
    listPrice: 599,
    expiresInHours: 17,
    stock: "In stock",
    color: "#dfe6ea",
  },
  {
    id: 7,
    title: "Le Creuset Signature Cast Iron Casserole",
    merchant: "Kitchen & Co",
    category: "Home",
    salePrice: 189,
    listPrice: 315,
    expiresInHours: 5,
    stock: "Final units",
    color: "#f5dfda",
  },
  {
    id: 8,
    title: "Patagonia Better Sweater Fleece",
    merchant: "TrailSupply",
    category: "Fashion",
    salePrice: 74,
    listPrice: 130,
    expiresInHours: 26,
    stock: "Sizes S-L",
    color: "#dfeee0",
  },
];

const flashDeals = [
  {
    id: 101,
    title: "Dyson V12 Detect Slim Cordless Vacuum",
    merchant: "CleanHouse",
    category: "Home",
    salePrice: 329,
    listPrice: 549,
    expiresInHours: 8,
    stock: "Flash drop",
    color: "#e3edf0",
  },
  {
    id: 102,
    title: "Nintendo Switch OLED Console Bundle",
    merchant: "PlayPort",
    category: "Tech",
    salePrice: 269,
    listPrice: 349,
    expiresInHours: 10,
    stock: "12 left",
    color: "#e8dddd",
  },
  {
    id: 103,
    title: "Lisbon Boutique Hotel Weekend",
    merchant: "StayScout",
    category: "Travel",
    salePrice: 156,
    listPrice: 290,
    expiresInHours: 6,
    stock: "2 rooms",
    color: "#dcecdf",
  },
];

const categoryColors = {
  Fashion: "#e7e2f2",
  Food: "#efe1cb",
  Home: "#f7e5d8",
  Tech: "#d9eee5",
  Travel: "#dbe9f6",
};

const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
};

function sendJson(response, data) {
  response.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function broadcastDeals() {
  const payload = `data: ${JSON.stringify(deals)}\n\n`;
  clients.forEach((client) => client.write(payload));
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
    deal.salePrice > 0 &&
    deal.listPrice > deal.salePrice &&
    deal.expiresInHours > 0
  );
}

function rotateDemoDeal() {
  const next = flashDeals[Math.floor(Math.random() * flashDeals.length)];
  const existingIndex = deals.findIndex((deal) => deal.id === next.id);

  if (existingIndex >= 0) {
    deals = deals.filter((deal) => deal.id !== next.id);
  } else {
    deals = [{ ...next, salePrice: next.salePrice - Math.floor(Math.random() * 18) }, ...deals].slice(0, 10);
  }

  broadcastDeals();
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
  if (request.url === "/api/deals" && request.method === "GET") {
    sendJson(response, deals);
    return;
  }

  if (request.url === "/api/deals" && request.method === "POST") {
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
      };

      deals = [savedDeal, ...deals];
      broadcastDeals();
      sendJson(response, savedDeal);
    } catch {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    return;
  }

  if (request.url === "/api/deals/live") {
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

  serveStatic(request, response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`DealFinder live server running on port ${port}.`);
  console.log("Demo flash deals will appear or disappear every 8 seconds.");
});

setInterval(rotateDemoDeal, 8000);
