import { getPool } from "../db/pool.js";

const columns = "id, uid, provider_name, utility, city, notes, status, created_at";

async function insertRequest(uid, input) {
  const result = await getPool().query(
    `insert into provider_requests (uid, provider_name, utility, city, notes)
     values ($1, $2, $3, $4, $5)
     returning ${columns}`,
    [uid, input.providerName, input.utility, input.city, input.notes],
  );
  return result.rows[0];
}

async function listRequests(uid) {
  const result = await getPool().query(
    `select ${columns} from provider_requests where uid = $1 order by id desc`,
    [uid],
  );
  return result.rows;
}

export { insertRequest, listRequests };
