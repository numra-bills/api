import { fetchBill as fetchPitcBill } from "./electricity/pitc.js";
import { fetchBill as fetchSngplBill } from "./gas/sngpl.js";

export const utilities = ["electricity", "gas"] as const;

export type Utility = (typeof utilities)[number];

type AccountRule = {
  min: number;
  max: number;
};

type BillSnapshot = {
  data: unknown;
  meta: unknown;
};

export type FetchBill = (
  provider: { utility: string; code: string; name: string },
  account: string,
  options: { includeDocument: boolean },
) => Promise<BillSnapshot>;

type ProviderBase = {
  utility: Utility;
  code: string;
  name: string;
  account: AccountRule;
};

export type Provider =
  | (ProviderBase & { implemented: true; fetch: FetchBill })
  | (ProviderBase & { implemented: false });

// Add a company here. implemented: false returns 501 and has no fetch.
export const providers = [
  {
    utility: "electricity",
    code: "hesco",
    name: "Hyderabad Electric Supply Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "lesco",
    name: "Lahore Electric Supply Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "fesco",
    name: "Faisalabad Electric Supply Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "iesco",
    name: "Islamabad Electric Supply Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "mepco",
    name: "Multan Electric Power Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "gepco",
    name: "Gujranwala Electric Power Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "pesco",
    name: "Peshawar Electric Supply Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "qesco",
    name: "Quetta Electric Supply Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "sepco",
    name: "Sukkur Electric Power Company",
    implemented: true,
    account: { min: 10, max: 14 },
    fetch: fetchPitcBill,
  },
  {
    utility: "gas",
    code: "sngpl",
    name: "Sui Northern Gas Pipelines Limited",
    implemented: true,
    account: { min: 10, max: 11 },
    fetch: fetchSngplBill,
  },
  {
    utility: "gas",
    code: "ssgc",
    name: "Sui Southern Gas Company",
    implemented: false,
    account: { min: 10, max: 12 },
  },
  {
    utility: "electricity",
    code: "tesco",
    name: "Tribal Areas Electric Supply Company",
    implemented: false,
    account: { min: 14, max: 14 },
  },
  {
    utility: "electricity",
    code: "hazeco",
    name: "Hazara Electric Supply Company",
    implemented: false,
    account: { min: 14, max: 14 },
  },
  {
    utility: "electricity",
    code: "ajk",
    name: "Azad Jammu & Kashmir Electricity Department",
    implemented: false,
    account: { min: 14, max: 14 },
  },
  {
    utility: "electricity",
    code: "sundar",
    name: "Sundar Electricity",
    implemented: false,
    account: { min: 14, max: 14 },
  },
  {
    utility: "electricity",
    code: "k-electric",
    name: "K-Electric Limited",
    implemented: false,
    account: { min: 13, max: 13 },
  },
] as const satisfies readonly Provider[];
