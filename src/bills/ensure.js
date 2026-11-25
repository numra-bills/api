import { providers } from "../providers/index.ts";
import { latestBill, saveDocument, upsertBill } from "./store.js";

const freshForMs = 12 * 60 * 60 * 1000;
const pending = new Map();

function isFresh(row) {
  if (!row) return false;
  return Date.now() - new Date(row.checked_at).getTime() < freshForMs;
}

async function storeSnapshot(provider, referenceNo, snapshot) {
  const data = snapshot.data || {};
  const billingMonth = data.billingMonth && String(data.billingMonth).trim();
  if (!billingMonth) return latestBill(provider.code, referenceNo);
  const row = await upsertBill({
    provider: provider.code,
    referenceNo,
    billingMonth,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    payableWithinDueDate: data.payableWithinDueDate,
    payableAfterDueDate: data.payableAfterDueDate,
    currency: data.currency || "PKR",
    units: data.units,
    lastReading: data.lastReading,
    previousReading: data.previousReading,
    customerName: data.customer && data.customer.name,
    customerAddress: data.customer && data.customer.address,
    charges: data.charges,
    meter: data.meter,
    history: data.history,
    details: data.details,
    source: snapshot.meta && snapshot.meta.source,
  });
  if (data.document && data.document.content) await saveDocument(row.id, data.document);
  return row;
}

async function fetchAndStore(provider, referenceNo) {
  const snapshot = await provider.fetch(provider, referenceNo, { includeDocument: false });
  return storeSnapshot(provider, referenceNo, snapshot);
}

async function loadBill(providerCode, referenceNo) {
  const stored = await latestBill(providerCode, referenceNo);
  if (isFresh(stored)) return { row: stored, fetched: false };
  const provider = providers.find((item) => item.code === providerCode);
  if (!provider || provider.implemented === false) return { row: stored, fetched: false };
  try {
    const row = await fetchAndStore(provider, referenceNo);
    return { row, fetched: true };
  } catch {
    return { row: stored, fetched: false };
  }
}

function ensureBill(providerCode, referenceNo) {
  const key = `${providerCode}:${referenceNo}`;
  const current = pending.get(key);
  if (current) return current;
  const job = loadBill(providerCode, referenceNo).finally(() => {
    pending.delete(key);
  });
  pending.set(key, job);
  return job;
}

export { ensureBill, freshForMs, storeSnapshot };
