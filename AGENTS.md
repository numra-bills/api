# Utility Bill API

Read this file before opening source files. Do not scan the tree or re-read files to recover context that is written here. Open a file only when the task changes it, or when this note is not enough.

This repo is the API only. The Expo app is a separate repo. Commit only when asked, one commit per piece of work, and never push unless asked. Do not change git config.

## Run

```bash
pnpm install
pnpm start
```

`pnpm start` and `pnpm dev` run `tsx server.js`. `pnpm typecheck` runs `tsc --noEmit` on `src/providers/index.ts` only. Nothing is compiled to disk.

Default port is `3002`. `PORT` overrides it. `PROXY_URL` is passed to the PITC and SNGPL requests.

The package is ESM (`"type": "module"`). Use `import` and `export`. A relative import must include the real extension: `.js` for JavaScript, `.ts` for `src/providers/index.ts`. Node does not guess an extension for `import`. `pnpm-workspace.yaml` allows the esbuild build so `tsx` can install.

Node 22 can run `node server.js`. Node 20 cannot load the TypeScript provider list, so use `pnpm start`.

Do not start or restart the server unless asked.

## API

Routes, in `src/routes/v1.js`:

- `GET /api/v1/providers`
- `GET /api/v1/me` and `PATCH /api/v1/me` require `Authorization: Bearer <Firebase ID token>`. Firebase Admin verifies it. The profile row is in `users`, keyed by the Firebase uid. The response data is `{ uid, name, email, city }`. `GET` creates the row when it is missing. `PATCH` body is `{ name, city }`. Email is taken from the token, not from the body. Set `GOOGLE_CLOUD_PROJECT` or `GOOGLE_APPLICATION_CREDENTIALS`. If neither is set the response is `503` `auth_unavailable`. A missing or bad token is `401` `unauthorized`. The provider and bill routes stay public.
- `GET /api/v1/accounts`, `POST /api/v1/accounts`, `PATCH /api/v1/accounts/:id`, and `DELETE /api/v1/accounts/:id` require the same bearer token. These are the signed-in user's saved bills in localhost Postgres (`saved_accounts`). The uid comes from the token. The unique key is `(uid, provider, reference_no)`. `POST` body is `{ provider, referenceNo, category, tag }`. A repeat of that key is `409` `duplicate_account`. A missing `DATABASE_URL` is `503` `database_unavailable`. Each account includes `bill`, the latest shared snapshot for that provider and reference, and `reading`, the latest meter reading that user typed for that saved bill. `bill` includes `units`, `charges`, and `history` from that stored month. The home screen, bill details, and profile counts read this same account list. `POST /api/v1/accounts/:id/readings` with `{ reading, tag }` stores a new row in `meter_readings`. The row belongs to that uid and saved account. A reading lower than the user's last reading, or lower than the provider meter reading when the user has not typed one yet, is `400` `reading_too_low`. Deleting the saved account deletes its readings.
- `bills` stores one shared row per `(provider, reference_no, billing_month)`. `GET`, `POST`, and `PATCH` on accounts call the provider only when that reference has no fresh snapshot. Fresh means `checked_at` within 12 hours. The same month updates the existing row. A new billing month inserts another row. A provider failure leaves the saved account in the response with `bill: null`, or with the older row when one exists. `POST /bills` does not write this table.
- `GET /api/v1/provider-requests` and `POST /api/v1/provider-requests` require the same bearer token. Each send of the request-a-provider form inserts one `provider_requests` row for that uid. `POST` body is `{ providerName, utility, city, notes }`. `utility` is `electricity`, `gas`, `water`, `internet`, or `other`. `status` starts as `open`. The same user can send the same name again. `GET` returns only that uid's rows.
- `POST /api/v1/:utility/:provider/bills` with `{ "account", "includeDocument" }`

`account` is the only account field on the bill fetch. Company codes are lowercase. `POST /bills` fetches the current bill and does not save it. `GOOGLE_APPLICATION_CREDENTIALS` points at the Firebase service-account JSON. Do not commit that file or `backend/.env`. `DATABASE_URL` lives in `backend/.env`. Local database name is `pitc_bills`.

Unknown utility or provider is `404` `provider_not_found`. A known provider with `implemented: false` is `501` `not_implemented` after the account check. A short or non-digit account is `400` and does not call upstream.

Success body: `{ success, data, meta }`. `meta` is `{ fetchedAt, source }`. Error body: `{ success: false, error: { code, message } }`.

`GET /providers` returns `{ success, data: [{ utility, code, name, implemented }] }`. It omits `fetch` and `account`.

## Providers

`src/providers/index.ts` is the only company list. Add a row there. There is no registry, no `FETCHERS` map, and no `byKey`.

`billsController.js` finds the row with `utility` and `code`, checks `account.min` and `account.max`, then calls `provider.fetch(provider, account, { includeDocument })`.

- `implemented: true` must have `fetch`.
- `implemented: false` has no `fetch` and returns 501 after a valid account.

PITC companies share one file, `src/providers/electricity/pitc.js`, and one parser, `parsePitcHtml.js`. The page is `https://bill.pitc.com.pk/{code}bill`. Do not split `pitc.js` into a second fetch file. `pitcBill.js` is gone.

Live PITC codes, account length 10 to 14: `hesco`, `lesco`, `fesco`, `iesco`, `mepco`, `gepco`, `pesco`, `qesco`, `sepco`.

Rows added as not implemented: `tesco`, `hazeco`, `ajk`, `sundar` (14 digits) and `k-electric` (13 digits). Do not implement them unless asked. K-Electric has its own site. When it is implemented it gets its own file and its own `fetch`, plus the existing row. Do not put it inside `pitc.js`.

SNGPL is `src/providers/gas/sngpl.js` plus `parseSngplHtml.js`. The request is the official app URL with `client=ANDROID`. No captcha. Account length is 10 or 11.

SSGC is a row with `implemented: false` and account length 10 to 12. There is no `ssgc.js`.

## Bill response

There is no schema function. `buildSnapshot` in `src/domain/snapshot.js` builds `data` and `meta`. `sendSuccess` wraps them.

Shared `data` keys: `utility`, `provider` (`code`, `name`), `account`, `billingMonth`, `issueDate`, `dueDate`, `currency` (`PKR`), `payableWithinDueDate`, `payableAfterDueDate`, `status`, `lastReading`, `previousReading`, `units`, `charges`, `meter`, `history`, `customer` (`name`, `address`), `details`, `document`.

`charges`, `meter`, `history`, and `details` come from the parser. Electricity keys are mapped in `parsePitcHtml.js`. Gas keys are mapped in `sngpl.js`. A missing value is `null`. Add a new optional key in the parser. Do not rename a key or change its type.

`document` is `null` unless `includeDocument` is `true` or `"true"`. Then it is `{ mimeType: "text/html", encoding: "utf-8", baseUrl, content }`. Do not return PDF base64.

`status` is computed in `snapshot.js` at request time, in Asia/Karachi: payable `<= 0` is `paid`; payable `> 0` after the due date is `overdue`; on or before the due date, or an unparseable due date, is `pending`. The due date itself is still pending.

## Where to edit

| Change | File |
| --- | --- |
| Add or hide a company | `src/providers/index.ts` |
| PITC request or fallback table parse | `src/providers/electricity/pitc.js` |
| PITC fields | `src/providers/electricity/parsePitcHtml.js` |
| SNGPL request | `src/providers/gas/sngpl.js` |
| SNGPL fields | `src/providers/gas/parseSngplHtml.js` |
| Shared response keys or status | `src/domain/snapshot.js` |
| Account check or fetch call | `src/controllers/billsController.js` |
| Public provider list | `src/controllers/providersController.js` |

Do not add a provider unless asked. Authenticated routes are `GET /api/v1/me` and the `/api/v1/accounts` routes.
