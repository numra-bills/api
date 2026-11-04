# Utility Bill API

Combined backend for electricity and gas bills.

Default port is `3002`.

```bash
pnpm install
node server.js
```

`PORT` sets the port. `PROXY_URL` is passed through to provider requests.

## Fetch the current bill

```bash
curl -s -X POST http://localhost:3002/api/v1/{utility}/{provider}/bills \
  -H 'Content-Type: application/json' \
  -d '{"account":"ACCOUNT","includeDocument":false}'
```

`account` is the reference number for a DISCO and the consumer number for a gas company. Set `includeDocument` to `true` to add the official HTML. The default response is the normalized bill only.

Shared fields live on `data`. A field that belongs to one provider only lives on `data.details`. Add a new optional key there when you find it in the bill. Do not rename or change the type of a key that is already returned.

## Providers

```bash
curl -s http://localhost:3002/api/v1/providers
```

A new company is a provider file registered in `src/providers/registry.js`. It is not a new route.

Status is `paid` when the payable amount is `0` or less, `overdue` when that amount is still due after the due date in Asia/Karachi, and `pending` on or before the due date.
