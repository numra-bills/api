import express from "express";
import { getAccounts, patchAccount, postAccount, removeAccount } from "../controllers/accountsController.js";
import { postReading } from "../controllers/readingsController.js";
import { getMe, patchMe } from "../controllers/usersController.js";
import { getRequests, postRequest } from "../controllers/requestsController.js";
import { listProviders } from "../controllers/providersController.js";
import { createBill } from "../controllers/billsController.js";
import { requireUser } from "../http/requireUser.js";

const router = express.Router();

router.get("/providers", listProviders);
router.get("/provider-requests", requireUser, getRequests);
router.post("/provider-requests", requireUser, postRequest);
router.get("/me", requireUser, getMe);
router.patch("/me", requireUser, patchMe);
router.get("/accounts", requireUser, getAccounts);
router.post("/accounts", requireUser, postAccount);
router.patch("/accounts/:id", requireUser, patchAccount);
router.post("/accounts/:id/readings", requireUser, postReading);
router.delete("/accounts/:id", requireUser, removeAccount);
router.post("/:utility/:provider/bills", createBill);

export default router;
