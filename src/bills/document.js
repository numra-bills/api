import { providers } from "../providers/index.ts";
import { HttpError } from "../http/errors.js";
import { readDocument } from "./store.js";
import { storeSnapshot } from "./ensure.js";

const pending = new Map();

async function loadDocument(providerCode, referenceNo) {
  const existing = await readDocument(providerCode, referenceNo);
  if (existing && existing.document && existing.document.content) return existing.document;
  const provider = providers.find((item) => item.code === providerCode);
  if (!provider || provider.implemented === false) {
    throw new HttpError(501, "not_implemented", "This provider is not available yet.");
  }
  const snapshot = await provider.fetch(provider, referenceNo, { includeDocument: true });
  const document = snapshot.data && snapshot.data.document;
  if (!document || !document.content) {
    throw new HttpError(404, "document_unavailable", "The bill page is not available.");
  }
  await storeSnapshot(provider, referenceNo, snapshot);
  return document;
}

function ensureDocument(providerCode, referenceNo) {
  const key = `document:${providerCode}:${referenceNo}`;
  const current = pending.get(key);
  if (current) return current;
  const job = loadDocument(providerCode, referenceNo).finally(() => {
    pending.delete(key);
  });
  pending.set(key, job);
  return job;
}

export { ensureDocument };
