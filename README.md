# design-charrette

A Cloudflare Worker built with [Hono](https://hono.dev/), backed by R2 storage and KV.

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) v9+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed via dev dependencies)

## Getting Started

Install dependencies and start the local dev server:

```txt
npm install
npm run dev
```

## Deployment

Deploy to Cloudflare Workers:

```txt
npm run deploy
```

## Type Generation

Sync TypeScript types from your Worker configuration:

```txt
npm run cf-typegen
```

See the [Wrangler types docs](https://developers.cloudflare.com/workers/wrangler/commands/#types) for more details.
