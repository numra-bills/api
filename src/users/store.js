import { getPool } from "../db/pool.js";

const columns = "uid, name, email, city, created_at, updated_at";

async function findUser(uid) {
  const result = await getPool().query(`select ${columns} from users where uid = $1`, [uid]);
  return result.rows[0] || null;
}

async function insertUser(uid, input) {
  const result = await getPool().query(
    `insert into users (uid, name, email, city)
     values ($1, $2, $3, $4)
     on conflict (uid) do nothing
     returning ${columns}`,
    [uid, input.name, input.email, input.city],
  );
  return result.rows[0] || findUser(uid);
}

async function saveUser(uid, input) {
  const result = await getPool().query(
    `insert into users (uid, name, email, city)
     values ($1, $2, $3, $4)
     on conflict (uid) do update set
       name = excluded.name,
       email = excluded.email,
       city = excluded.city,
       updated_at = now()
     returning ${columns}`,
    [uid, input.name, input.email, input.city],
  );
  return result.rows[0];
}

export { findUser, insertUser, saveUser };
