const { getPITCBill, validateReferenceNumber } = require("../../../../backend/pitc-bill");
const { badRequest, notFound, upstream } = require("../../http/errors");
const { buildSnapshot, documentFrom, parseAmount } = require("../../domain/snapshot");

const BASE_URL = "https://bill.pitc.com.pk/";

function createPitcProvider(company) {
  return {
    utility: "electricity",
    code: company.code,
    name: company.name,
    implemented: true,
    validateAccount(account) {
      const validation = validateReferenceNumber(account);
      if (!validation.valid) {
        throw badRequest("invalid_account", "Account must be 10 to 14 digits");
      }
      return validation.refNo;
    },
    async fetchBill(account, { includeDocument = false } = {}) {
      const result = await getPITCBill(account, company.code);
      if (!result.success) {
        const message = result.error || "Electricity bill request failed";
        if (/timeout|unable to connect|failed to extract required tokens/i.test(message)) {
          throw upstream("upstream_error", message);
        }
        throw notFound("bill_not_found", message);
      }

      const data = result.data || {};
      const consumer = data.consumerDetails || {};
      const bill = data.billDetails || {};
      const charges = data.charges || {};
      const payableWithinDueDate =
        parseAmount(charges.totalAmount) ?? parseAmount(charges.displayAmount);

      return buildSnapshot({
        utility: "electricity",
        provider: this,
        account,
        source: company.code,
        document: includeDocument ? documentFrom(data.rawHtml, BASE_URL) : null,
        fields: {
          billingMonth: null,
          issueDate: bill.issueDate,
          dueDate: bill.dueDate,
          payableWithinDueDate,
          payableAfterDueDate: charges.amountAfterDueDate,
          lastReading: bill.currentReading,
          previousReading: bill.previousReading,
          units: bill.unitsConsumed,
          charges: {
            totalAmount: parseAmount(charges.totalAmount),
            amountAfterDueDate: parseAmount(charges.amountAfterDueDate),
            electricityCharges: parseAmount(charges.electricityCharges),
            gst: parseAmount(charges.gst),
            displayAmount: parseAmount(charges.displayAmount),
          },
          meter: {
            currentReading: bill.currentReading || null,
            previousReading: bill.previousReading || null,
          },
          history: [],
          customer: {
            name: consumer.name,
            address: consumer.address,
          },
          details: {
            tariff: bill.tariff || null,
            customerId: consumer.customerId || null,
            readingDate: bill.readingDate || null,
          },
        },
      });
    },
  };
}

module.exports = {
  createPitcProvider,
};
