import { readFileSync } from "node:fs";

import { getPool } from "./pool.js";
import { loadEnv } from "../env.js";

async function migrate() {
  loadEnv();
  if (!process.env.DATABASE_URL) return;
  const sql = readFileSync(new URL("../../db/001_saved_accounts.sql", import.meta.url), "utf8");
  await getPool().query(sql);
}

export { migrate };
