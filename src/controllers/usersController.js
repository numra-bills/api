import { badRequest } from "../http/errors.js";
import { sendSuccess } from "../http/response.js";
import { findUser, insertUser, saveUser } from "../users/store.js";

function text(value, max) {
  return String(value || "").trim().slice(0, max);
}

function present(row) {
  return {
    uid: row.uid,
    name: row.name,
    email: row.email,
    city: row.city,
  };
}

async function getMe(req, res, next) {
  try {
    let row = await findUser(req.uid);
    if (!row) {
      row = await insertUser(req.uid, {
        name: text(req.displayName, 80),
        email: text(req.email, 200),
        city: null,
      });
    }
    sendSuccess(res, present(row));
  } catch (error) {
    next(error);
  }
}

async function patchMe(req, res, next) {
  try {
    const body = req.body || {};
    const name = text(body.name, 80);
    if (!name) throw badRequest("name_required", "Enter your name.");
    const email = text(req.email, 200) || text(body.email, 200);
    if (!email) throw badRequest("email_required", "Enter your email.");
    const city = text(body.city, 80) || null;
    const row = await saveUser(req.uid, { name, email, city });
    sendSuccess(res, present(row));
  } catch (error) {
    next(error);
  }
}

export { getMe, patchMe };
