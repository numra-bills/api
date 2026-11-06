# Utility Bill API

Combined backend for electricity (PITC) and gas (SNGPL). SSGC is registered and returns `501` until a provider is added.

Default port is `3002`.

```bash
pnpm install
pnpm start
```

`PORT` sets the port. `PROXY_URL` is passed through to the PITC module and the SNGPL request. The package is ESM, so files use `import` and local imports include the `.js` extension.

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

SNGPL is fetched from the official app URL (`client=ANDROID`) and parsed from the HTML text. No captcha is shown. The HTML parser is `src/providers/gas/parseSngplHtml.js`. PITC electricity is fetched and read in `src/providers/electricity/pitc.js`, using the current layout parser in `src/providers/electricity/parsePitcHtml.js`. The returned HTML is UTF-8 and includes a base URL so the official styles load.

## Providers

```bash
curl -s http://localhost:3002/api/v1/providers
```

Supported companies are the list in `src/providers/index.ts`. Add one object. `implemented: true` must include `fetch`. `implemented: false` has no `fetch` and returns `501` after the account check. It is not a new route. DISCOs on the PITC portal share `fetchPitcBill` in `src/providers/electricity/pitc.js`. The bill page is `https://bill.pitc.com.pk/{code}bill`. A company with its own site, such as K-Electric, is a new file with its own `fetch`, plus one row in that list.

Status is `paid` when the payable amount is `0` or less, `overdue` when that amount is still due after the due date in Asia/Karachi, and `pending` on or before the due date.
