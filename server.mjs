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
    deal.salePrice >= 0 &&
    deal.listPrice > deal.salePrice &&
    deal.expiresInHours > 0
  );
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
        url: String(deal.url || "").trim(),
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
  console.log("Add deals through the app or POST /api/deals to update connected browsers.");
});
