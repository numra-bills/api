import { fetchBill as fetchPitcBill } from "./electricity/pitc.js";
import { fetchBill as fetchSngplBill } from "./gas/sngpl.js";

export const utilities = ["electricity", "gas", "internet", "water"] as const;

export type Utility = (typeof utilities)[number];

export type AccountField = {
  label: string;
  required: 0 | 1;
  min: number;
  max: number;
};

function ref(min: number, max: number): readonly AccountField[] {
  return [{ label: "Ref #", required: 1, min, max }];
}

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
  label: string;
  account: readonly AccountField[];
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
    label: "HESCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "lesco",
    name: "Lahore Electric Supply Company",
    label: "LESCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "fesco",
    name: "Faisalabad Electric Supply Company",
    label: "FESCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "iesco",
    name: "Islamabad Electric Supply Company",
    label: "IESCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "mepco",
    name: "Multan Electric Power Company",
    label: "MEPCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "gepco",
    name: "Gujranwala Electric Power Company",
    label: "GEPCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "pesco",
    name: "Peshawar Electric Supply Company",
    label: "PESCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "qesco",
    name: "Quetta Electric Supply Company",
    label: "QESCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "electricity",
    code: "sepco",
    name: "Sukkur Electric Power Company",
    label: "SEPCO",
    implemented: true,
    account: ref(10, 14),
    fetch: fetchPitcBill,
  },
  {
    utility: "gas",
    code: "sngpl",
    name: "Sui Northern Gas Pipelines Limited",
    label: "SNGPL",
    implemented: true,
    account: ref(10, 11),
    fetch: fetchSngplBill,
  },
  {
    utility: "gas",
    code: "ssgc",
    name: "Sui Southern Gas Company",
    label: "SSGC",
    implemented: false,
    account: ref(10, 12),
  },
  {
    utility: "electricity",
    code: "tesco",
    name: "Tribal Areas Electric Supply Company",
    label: "TESCO",
    implemented: false,
    account: ref(14, 14),
  },
  {
    utility: "electricity",
    code: "hazeco",
    name: "Hazara Electric Supply Company",
    label: "HAZECO",
    implemented: false,
    account: ref(14, 14),
  },
  {
    utility: "electricity",
    code: "ajk",
    name: "Azad Jammu & Kashmir Electricity Department",
    label: "AJK ED",
    implemented: false,
    account: ref(14, 14),
  },
  {
    utility: "electricity",
    code: "sundar",
    name: "Sundar Electricity",
    label: "Sundar",
    implemented: false,
    account: ref(14, 14),
  },
  {
    utility: "electricity",
    code: "k-electric",
    name: "K-Electric Limited",
    label: "K-Electric",
    implemented: false,
    account: ref(13, 13),
  },
  {
    utility: "internet",
    code: "ptcl",
    name: "Pakistan Telecommunication Company Limited",
    label: "PTCL",
    implemented: false,
    account: [
      { label: "Ref #", required: 0, min: 13, max: 13 },
      { label: "NTN #", required: 1, min: 5, max: 5 },
    ],
  },
  {
    utility: "internet",
    code: "nayatel",
    label: "Nayatel",
    name: "Nayatel",
    implemented: false,
    account: ref(13, 13),
  },
  {
    utility: "water",
    code: "wasa",
    name: "Water and Sewerage Authority",
    label: "WASA",
    implemented: false,
    account: ref(13, 13),
  },
] as const satisfies readonly Provider[];
