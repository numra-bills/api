import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { HttpError } from "./errors.js";

function adminAuth() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new HttpError(503, "auth_unavailable", "Firebase Admin credentials are not configured.");
  }
  try {
    if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
    return getAuth();
  } catch {
    throw new HttpError(503, "auth_unavailable", "Firebase Admin credentials are not configured.");
  }
}

async function requireUser(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const match = /^Bearer (.+)$/.exec(header);
    if (!match) throw new HttpError(401, "unauthorized", "Sign in required.");
    const decoded = await adminAuth().verifyIdToken(match[1]);
    req.uid = decoded.uid;
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }
    next(new HttpError(401, "unauthorized", "Sign in required."));
  }
}

export { requireUser };
