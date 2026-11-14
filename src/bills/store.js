import { getPool } from "../db/pool.js";

const columns = `id, provider, reference_no, billing_month, issue_date, due_date,
  payable_within_due_date, payable_after_due_date, currency, units,
  last_reading, previous_reading, customer_name, customer_address,
  charges, meter, history, details, source, checked_at, created_at`;

async function latestBill(provider, referenceNo) {
  const result = await getPool().query(
    `select ${columns}
     from bills
     where provider = $1 and reference_no = $2
     order by checked_at desc, id desc
     limit 1`,
    [provider, referenceNo],
  );
  return result.rows[0] || null;
}

async function upsertBill(input) {
  const result = await getPool().query(
    `insert into bills (
       provider, reference_no, billing_month, issue_date, due_date,
       payable_within_due_date, payable_after_due_date, currency, units,
       last_reading, previous_reading, customer_name, customer_address,
       charges, meter, history, details, source, checked_at
     )
     values (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12, $13,
       $14, $15, $16, $17, $18, now()
     )
     on conflict (provider, reference_no, billing_month)
     do update set
       issue_date = excluded.issue_date,
       due_date = excluded.due_date,
       payable_within_due_date = excluded.payable_within_due_date,
       payable_after_due_date = excluded.payable_after_due_date,
       currency = excluded.currency,
       units = excluded.units,
       last_reading = excluded.last_reading,
       previous_reading = excluded.previous_reading,
       customer_name = excluded.customer_name,
       customer_address = excluded.customer_address,
       charges = excluded.charges,
       meter = excluded.meter,
       history = excluded.history,
       details = excluded.details,
       source = excluded.source,
       checked_at = now()
     returning ${columns}`,
    [
      input.provider,
      input.referenceNo,
      input.billingMonth,
      input.issueDate,
      input.dueDate,
      input.payableWithinDueDate,
      input.payableAfterDueDate,
      input.currency,
      input.units,
      input.lastReading,
      input.previousReading,
      input.customerName,
      input.customerAddress,
      JSON.stringify(input.charges || {}),
      JSON.stringify(input.meter || {}),
      JSON.stringify(input.history || []),
      JSON.stringify(input.details || {}),
      input.source,
    ],
  );
  return result.rows[0];
}

export { latestBill, upsertBill };
