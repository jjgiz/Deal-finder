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
