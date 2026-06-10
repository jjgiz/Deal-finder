# DealFinder Passive Setup

This app becomes more passive when fresh deals arrive automatically, the site ranks them, and visitors can return through saved deals or deal alerts.

## 1. Import deals automatically

Run this command to refresh `deals.json`:

```sh
npm run import:deals
```

By default it keeps the current deals. To pull from external JSON feeds, set `DEAL_FEED_URLS` to one or more comma-separated feed URLs:

```sh
DEAL_FEED_URLS="https://example.com/deals.json,https://example.com/more-deals.json" npm run import:deals
```

The importer accepts feeds shaped like any of these:

```json
[
  {
    "title": "Example Monitor",
    "merchant": "Example Store",
    "category": "Tech",
    "salePrice": 129.99,
    "listPrice": 179.99,
    "expiresInHours": 48,
    "stock": "In stock",
    "url": "https://example.com/deal"
  }
]
```

It also accepts `{ "deals": [] }`, `{ "items": [] }`, or `{ "products": [] }`.

## 2. Schedule it

On Render, create a Cron Job with:

```sh
npm run import:deals
```

Use the same persistent disk as the web service, or set the same `DEALS_FILE` path for both the cron job and the web service.

Good starting schedule:

```txt
0 */6 * * *
```

That refreshes deals every 6 hours.

## 3. Add real revenue links

Apply to affiliate or partner programs, then use their approved feed/API URLs or tracking links.

Useful categories:

- Amazon Associates / Product Advertising API
- Awin merchant feeds
- Impact product feeds
- Partnerize feeds
- eBay Browse API
- Retailer CSV/JSON feeds

When you have an Amazon Associates tag, set:

```sh
AMAZON_ASSOCIATE_TAG="yourtag-21"
```

## 4. Make it more passive

The next automation layer should be:

- Email subscribers when a matching new deal appears.
- Add SEO pages for niches such as `/tech-deals`, `/lego-deals`, and `/air-fryer-deals`.
- Add an admin metrics page showing top clicked deals and top categories.
- Auto-remove deals older than their expiry window.

The core loop is:

```txt
Feeds/APIs -> importer -> deals.json -> site -> clicks/signups -> better deal choices
```
