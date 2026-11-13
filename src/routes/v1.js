import express from "express";
import { getAccounts, patchAccount, postAccount, removeAccount } from "../controllers/accountsController.js";
import { listProviders } from "../controllers/providersController.js";
import { createBill } from "../controllers/billsController.js";
import { sendSuccess } from "../http/response.js";
import { requireUser } from "../http/requireUser.js";

const router = express.Router();

router.get("/providers", listProviders);
router.get("/me", requireUser, (req, res) => {
  sendSuccess(res, { uid: req.uid });
});
router.get("/accounts", requireUser, getAccounts);
router.post("/accounts", requireUser, postAccount);
router.patch("/accounts/:id", requireUser, patchAccount);
router.delete("/accounts/:id", requireUser, removeAccount);
router.post("/:utility/:provider/bills", createBill);

export default router;
