import { readdirSync, readFileSync } from "node:fs";

import { getPool } from "./pool.js";
import { loadEnv } from "../env.js";

async function migrate() {
  loadEnv();
  if (!process.env.DATABASE_URL) return;
  const dir = new URL("../../db/", import.meta.url);
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const pool = getPool();
  for (const name of files) {
    await pool.query(readFileSync(new URL(name, dir), "utf8"));
  }
}

export { migrate };
