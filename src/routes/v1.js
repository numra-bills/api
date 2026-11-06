import express from "express";
import { listProviders } from "../controllers/providersController.js";
import { createBill } from "../controllers/billsController.js";

const router = express.Router();

router.get("/providers", listProviders);
router.post("/:utility/:provider/bills", createBill);

export default router;
