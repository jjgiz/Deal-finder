const starterDeals = [
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

let deals = [...starterDeals];

const state = {
  category: "All",
  query: "",
  minDiscount: 20,
  sort: "score",
  saved: new Set(JSON.parse(localStorage.getItem("savedDeals") || "[]")),
};

const categoryFilters = document.querySelector("#categoryFilters");
const dealGrid = document.querySelector("#dealGrid");
const template = document.querySelector("#dealCardTemplate");
const search = document.querySelector("#search");
const discountRange = document.querySelector("#discountRange");
const discountOutput = document.querySelector("#discountOutput");
const sortSelect = document.querySelector("#sortSelect");
const savedDeals = document.querySelector("#savedDeals");
const savedCount = document.querySelector("#savedCount");
const visibleCount = document.querySelector("#visibleCount");
const avgDrop = document.querySelector("#avgDrop");
const endingSoon = document.querySelector("#endingSoon");
const estValue = document.querySelector("#estValue");
const liveStatus = document.querySelector("#liveStatus");
const addDealForm = document.querySelector("#addDealForm");
const addDealMessage = document.querySelector("#addDealMessage");
const newsletterForm = document.querySelector("#newsletterForm");
const newsletterMessage = document.querySelector("#newsletterMessage");

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

function discountFor(deal) {
  return Math.round(((deal.listPrice - deal.salePrice) / deal.listPrice) * 100);
}

function scoreFor(deal) {
  const urgencyBoost = Math.max(0, 24 - deal.expiresInHours);
  return Math.min(99, Math.round(discountFor(deal) * 1.25 + urgencyBoost * 1.7));
}

function savingsFor(deal) {
  return Math.max(0, deal.listPrice - deal.salePrice);
}

function signalFor(deal) {
  const score = scoreFor(deal);

  if (score >= 70) return "Strong signal";
  if (score >= 45) return "Good signal";
  return "Watchlist";
}

function categories() {
  return ["All", ...new Set(deals.map((deal) => deal.category))];
}

function usableDeals(nextDeals) {
  return Array.isArray(nextDeals) && nextDeals.length > 0 ? nextDeals : starterDeals;
}

function renderCategories() {
  categoryFilters.innerHTML = "";

  categories().forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${state.category === category ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.category = category;
      render();
    });
    categoryFilters.append(button);
  });
}

function filteredDeals() {
  const query = state.query.toLowerCase().trim();

  return deals
    .filter((deal) => state.category === "All" || deal.category === state.category)
    .filter((deal) => discountFor(deal) >= state.minDiscount)
    .filter((deal) => {
      if (!query) return true;
      return [deal.title, deal.merchant, deal.category].some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (state.sort === "discount") return discountFor(b) - discountFor(a);
      if (state.sort === "price") return a.salePrice - b.salePrice;
      if (state.sort === "expires") return a.expiresInHours - b.expiresInHours;
      return scoreFor(b) - scoreFor(a);
    });
}

function renderDeals(items) {
  dealGrid.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No matching deals. Loosen a filter and try again.";
    dealGrid.append(empty);
    return;
  }

  items.forEach((deal) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.style.setProperty("--deal-color", deal.color);
    card.querySelector(".category-pill").textContent = deal.category;
    card.querySelector("h3").textContent = deal.title;
    card.querySelector(".merchant").textContent = deal.merchant;
    card.querySelector(".score").textContent = `${scoreFor(deal)}`;
    card.querySelector(".sale-price").textContent = money.format(deal.salePrice);
    card.querySelector(".list-price").textContent = money.format(deal.listPrice);
    card.querySelector(".discount").textContent = `${discountFor(deal)}% off`;
    card.querySelector(".savings").textContent = `${money.format(savingsFor(deal))} saved`;
    card.querySelector(".signal").textContent = signalFor(deal);
    card.querySelector(".expires").textContent = `${deal.expiresInHours}h left`;
    card.querySelector(".stock").textContent = deal.stock;

    const saveButton = card.querySelector(".save-button");
    saveButton.classList.toggle("saved", state.saved.has(deal.id));
    saveButton.textContent = state.saved.has(deal.id) ? "♥" : "♡";
    saveButton.addEventListener("click", () => toggleSaved(deal.id));

    card.querySelector(".primary-button").addEventListener("click", () => {
      if (deal.url) {
        window.open(`/out?deal=${encodeURIComponent(deal.id)}`, "_blank", "noopener");
        return;
      }

      toggleSaved(deal.id);
    });

    dealGrid.append(card);
  });
}

function renderSaved() {
  const saved = deals.filter((deal) => state.saved.has(deal.id));
  savedCount.textContent = saved.length;
  savedDeals.innerHTML = "";

  if (!saved.length) {
    const empty = document.createElement("p");
    empty.className = "saved-item";
    empty.textContent = "Save deals to compare them here.";
    savedDeals.append(empty);
    return;
  }

  saved.forEach((deal) => {
    const item = document.createElement("div");
    item.className = "saved-item";
    item.innerHTML = `<strong>${deal.title}</strong><span>${money.format(deal.salePrice)} · ${discountFor(deal)}% off</span>`;
    savedDeals.append(item);
  });
}

function renderStats(items) {
  visibleCount.textContent = items.length;
  avgDrop.textContent = items.length
    ? `${Math.round(items.reduce((total, deal) => total + discountFor(deal), 0) / items.length)}%`
    : "0%";
  endingSoon.textContent = items.filter((deal) => deal.expiresInHours <= 12).length;
  estValue.textContent = money.format(items.reduce((total, deal) => total + savingsFor(deal), 0));
}

function toggleSaved(id) {
  if (state.saved.has(id)) {
    state.saved.delete(id);
  } else {
    state.saved.add(id);
  }

  localStorage.setItem("savedDeals", JSON.stringify([...state.saved]));
  render();
}

function render() {
  discountOutput.textContent = `${state.minDiscount}%`;
  renderCategories();
  const items = filteredDeals();
  renderStats(items);
  renderDeals(items);
  renderSaved();
}

function setLiveStatus(text, className) {
  liveStatus.textContent = text;
  liveStatus.className = `live-status ${className}`;
}

async function loadDeals() {
  try {
    const response = await fetch("/api/deals");
    deals = usableDeals(await response.json());
    setLiveStatus("Live", "connected");
    render();
  } catch {
    deals = [...starterDeals];
    setLiveStatus("Offline", "offline");
    render();
  }
}

function connectLiveDeals() {
  if (!window.EventSource) {
    loadDeals();
    setInterval(loadDeals, 15000);
    return;
  }

  const stream = new EventSource("/api/deals/live");

  stream.onopen = () => {
    setLiveStatus("Live", "connected");
  };

  stream.onmessage = (event) => {
    deals = usableDeals(JSON.parse(event.data));
    render();
  };

  stream.onerror = () => {
    setLiveStatus("Reconnecting", "");
  };
}

search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

discountRange.addEventListener("input", (event) => {
  state.minDiscount = Number(event.target.value);
  render();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

addDealForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  addDealMessage.textContent = "Adding...";

  const formData = new FormData(addDealForm);
  const deal = Object.fromEntries(formData.entries());
  deal.salePrice = Number(deal.salePrice);
  deal.listPrice = Number(deal.listPrice);
  deal.expiresInHours = Number(deal.expiresInHours);

  try {
    const response = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deal),
    });

    if (!response.ok) throw new Error("Deal was not accepted");

    addDealForm.reset();
    addDealMessage.textContent = "Deal added live.";
  } catch {
    addDealMessage.textContent = "Could not add deal.";
  }
});

newsletterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  newsletterMessage.textContent = "Saving...";

  const formData = new FormData(newsletterForm);
  const lead = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });

    if (!response.ok) throw new Error("Lead was not accepted");

    newsletterForm.reset();
    newsletterMessage.textContent = "You are on the alert list.";
  } catch {
    newsletterMessage.textContent = "Could not save this email.";
  }
});

render();
connectLiveDeals();
