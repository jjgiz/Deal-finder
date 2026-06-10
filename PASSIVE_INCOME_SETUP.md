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

This repo includes a starter feed you can use to test the full Render cron loop after deploying:

```txt
https://your-render-app.onrender.com/sample-deal-feed.json
```

Replace `your-render-app.onrender.com` with the real DealFinder app URL, then add that value to the `DEAL_FEED_URLS` environment variable on the Render cron job.

This starter feed proves the automation works. For real passive updates, replace it with merchant or affiliate-network feed URLs.

For Render, also add the same `DEAL_FEED_URLS` value to the **web service** environment. The web service imports deals on startup and then every 6 hours by default, which avoids cron/web-service filesystem separation.

Optional web-service setting:

```sh
IMPORT_INTERVAL_MINUTES="360"
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

If you are using Awin tracking links instead, set these on your Render web service:

```sh
AWIN_PUBLISHER_ID="your-awin-publisher-id"
AWIN_ADVERTISER_ID="the-advertiser-id-from-awin"
```

In Awin, the publisher ID is your account/site ID and the advertiser ID is the programme/merchant ID shown for the approved advertiser. After both values are set, DealFinder's `View deal` button routes through Awin before sending visitors to the retailer.

Use Awin only for advertisers/programmes you have actually been accepted into. If Amazon is handled through Amazon Associates instead of Awin in your account, use `AMAZON_ASSOCIATE_TAG` instead.

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
