import { getPool } from "../db/pool.js";
import { HttpError } from "../http/errors.js";

function savedOrThrow(error) {
  if (error instanceof HttpError) throw error;
  if (error && error.code === "23505") {
    throw new HttpError(409, "duplicate_account", "This reference is already saved.");
  }
  throw error;
}

const columns = "id, uid, provider, reference_no, category, tag, created_at";

async function listAccounts(uid) {
  const result = await getPool().query(
    `select ${columns} from saved_accounts where uid = $1 order by id desc`,
    [uid],
  );
  return result.rows;
}

async function insertAccount(uid, input) {
  try {
    const result = await getPool().query(
      `insert into saved_accounts (uid, provider, reference_no, category, tag)
       values ($1, $2, $3, $4, $5)
       returning ${columns}`,
      [uid, input.provider, input.referenceNo, input.category, input.tag],
    );
    return result.rows[0];
  } catch (error) {
    savedOrThrow(error);
  }
}

async function updateAccount(uid, id, input) {
  try {
    const result = await getPool().query(
      `update saved_accounts
       set provider = $3, reference_no = $4, category = $5, tag = $6
       where id = $1 and uid = $2
       returning ${columns}`,
      [id, uid, input.provider, input.referenceNo, input.category, input.tag],
    );
    return result.rows[0] || null;
  } catch (error) {
    savedOrThrow(error);
  }
}

async function deleteAccount(uid, id) {
  const result = await getPool().query(
    "delete from saved_accounts where id = $1 and uid = $2 returning id",
    [id, uid],
  );
  return result.rowCount > 0;
}

export { listAccounts, insertAccount, updateAccount, deleteAccount };
