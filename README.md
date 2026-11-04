# Utility Bill API

Combined backend for electricity (PITC) and gas (SNGPL). SSGC is registered and returns `501` until a provider is added.

Default port is `3002`.

```bash
pnpm install
node server.js
```

`PORT` sets the port. `PROXY_URL` is passed through to the PITC module and the SNGPL request.

## Fetch the current bill

```bash
curl -s -X POST http://localhost:3002/api/v1/gas/sngpl/bills \
  -H 'Content-Type: application/json' \
  -d '{"account":"30515063243"}'

curl -s -X POST http://localhost:3002/api/v1/electricity/fesco/bills \
  -H 'Content-Type: application/json' \
  -d '{"account":"20134131900302"}'
```

`account` is the reference number for a DISCO and the consumer number for SNGPL. Set `includeDocument` to `true` to add the official HTML. The default response is the normalized bill only.

```json
{ "account": "30515063243", "includeDocument": false }
```

Shared fields live on `data`. A field that belongs to one provider only lives on `data.details`. Add a new optional key there when you find it in the bill. Do not rename or change the type of a key that is already returned.

SNGPL is fetched from the official app URL (`client=ANDROID`) and parsed from the HTML text. No captcha is shown. The HTML parser is `suigass_api/sngpl.js`. Electricity is fetched by `backend/pitc-bill.js` and read from the current PITC bill layout in `src/providers/electricity/parsePitcHtml.js`. The returned HTML is UTF-8 and includes a base URL so the official styles load.

## Providers

```bash
curl -s http://localhost:3002/api/v1/providers
```

A new company is a provider file registered in `src/providers/registry.js`. It is not a new route.

Status is `paid` when the payable amount is `0` or less, `overdue` when that amount is still due after the due date in Asia/Karachi, and `pending` on or before the due date.
