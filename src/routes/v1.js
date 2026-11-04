const express = require("express");
const { listProviders } = require("../controllers/providersController");
const { createBill } = require("../controllers/billsController");

const router = express.Router();

router.get("/providers", listProviders);
router.post("/:utility/:provider/bills", createBill);

module.exports = router;
