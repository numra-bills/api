import { badRequest } from "../http/errors.js";

function accountFields(provider) {
  const account = provider && provider.account;
  if (Array.isArray(account)) return account;
  if (account && Number.isFinite(account.min) && Number.isFinite(account.max)) {
    return [{ label: "Ref #", required: 1, min: account.min, max: account.max }];
  }
  return [{ label: "Ref #", required: 1, min: 1, max: 24 }];
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function lengthMessage(rule) {
  if (rule.min === rule.max) return `${rule.label} must be ${rule.min} digits.`;
  return `${rule.label} must be ${rule.min} to ${rule.max} digits.`;
}

function checkOne(provider, account) {
  const rules = accountFields(provider);
  const rule = rules.find((item) => item.required === 1) || rules[0];
  const value = String(account || "").trim();
  if (!new RegExp(`^\\d{${rule.min},${rule.max}}$`).test(value)) {
    throw badRequest("invalid_account", lengthMessage(rule));
  }
  return value;
}

function readFields(provider, body) {
  const rules = accountFields(provider);
  const incoming = Array.isArray(body.fields) ? body.fields : null;
  const stored = [];
  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index];
    const match = incoming ? incoming.find((item) => item && item.label === rule.label) : null;
    const raw = match ? match.value : !incoming && index === 0 ? body.referenceNo : "";
    const value = digits(raw);
    if (rule.required === 1 && !value) {
      throw badRequest("field_required", `Enter ${rule.label}.`);
    }
    if (value && (value.length < rule.min || value.length > rule.max)) {
      throw badRequest("invalid_account", lengthMessage(rule));
    }
    if (value) stored.push({ label: rule.label, value });
  }
  const reference =
    stored.find((item) => {
      const rule = rules.find((candidate) => candidate.label === item.label);
      return rule && rule.required === 1;
    }) || stored[0];
  if (!reference) throw badRequest("reference_required", "Enter a reference number.");
  return { referenceNo: reference.value, fields: stored };
}

export { accountFields, checkOne, readFields };
