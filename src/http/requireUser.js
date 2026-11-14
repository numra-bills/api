import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { HttpError } from "./errors.js";

function adminAuth() {
  try {
    if (getApps().length === 0) {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        initializeApp({ credential: applicationDefault() });
      } else if (process.env.GOOGLE_CLOUD_PROJECT) {
        initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
      } else {
        throw new HttpError(503, "auth_unavailable", "Firebase project is not configured.");
      }
    }
    return getAuth();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "auth_unavailable", "Firebase project is not configured.");
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
