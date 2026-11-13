import pg from "pg";

import { loadEnv } from "../env.js";
import { HttpError } from "../http/errors.js";

const { Pool } = pg;

let pool;

function getPool() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new HttpError(503, "database_unavailable", "DATABASE_URL is not configured.");
  }
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export { getPool };
