import { join } from "node:path";
import { importDeals } from "../lib/deal-importer.mjs";

const root = process.cwd();
const dealsFile = process.env.DEALS_FILE || join(process.env.RENDER_DISK_PATH || root, "deals.json");

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

const result = await importDeals({ dealsFile, fallbackDeals });
const { deals, ...summary } = result;

console.log(JSON.stringify(summary, null, 2));
