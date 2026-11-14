import { getPool } from "../db/pool.js";

async function latestReadings(uid) {
  const result = await getPool().query(
    `select distinct on (account_id) account_id, reading, entered_at
     from meter_readings
     where uid = $1
     order by account_id, entered_at desc, id desc`,
    [uid],
  );
  return result.rows;
}

async function latestReading(uid, accountId) {
  const result = await getPool().query(
    `select reading, entered_at
     from meter_readings
     where uid = $1 and account_id = $2
     order by entered_at desc, id desc
     limit 1`,
    [uid, accountId],
  );
  return result.rows[0] || null;
}

async function insertReading(uid, accountId, reading) {
  const result = await getPool().query(
    `insert into meter_readings (uid, account_id, reading)
     values ($1, $2, $3)
     returning id, account_id, reading, entered_at`,
    [uid, accountId, reading],
  );
  return result.rows[0];
}

export { latestReadings, latestReading, insertReading };
