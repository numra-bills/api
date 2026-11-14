import { badRequest, notFound } from "../http/errors.js";
import { sendSuccess } from "../http/response.js";
import { getPool } from "../db/pool.js";
import { latestBill } from "../bills/store.js";
import { insertReading, latestReading } from "../readings/store.js";

function asNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function present(row) {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    value: Number(row.reading),
    enteredAt: new Date(row.entered_at).toISOString(),
  };
}

async function postReading(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw notFound("account_not_found", "Saved bill not found.");
    const owned = await getPool().query(
      "select id, provider, reference_no from saved_accounts where id = $1 and uid = $2",
      [id, req.uid],
    );
    const account = owned.rows[0];
    if (!account) throw notFound("account_not_found", "Saved bill not found.");

    const reading = asNumber(req.body && req.body.reading);
    if (reading == null || reading < 0) throw badRequest("invalid_reading", "Enter a meter reading.");

    const previousRow = await latestReading(req.uid, id);
    const bill = await latestBill(account.provider, account.reference_no);
    const previous = previousRow ? Number(previousRow.reading) : asNumber(bill && bill.last_reading);
    if (previous != null && reading < previous) {
      throw badRequest("reading_too_low", "The reading is lower than the previous one.");
    }

    const tag = req.body && "tag" in req.body ? String(req.body.tag || "").trim().slice(0, 16) || null : undefined;
    if (tag !== undefined) {
      await getPool().query("update saved_accounts set tag = $3 where id = $1 and uid = $2", [id, req.uid, tag]);
    }

    const row = await insertReading(req.uid, id, reading);
    sendSuccess(res, present(row));
  } catch (error) {
    next(error);
  }
}

export { postReading, asNumber };
