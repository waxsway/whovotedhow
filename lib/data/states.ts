// Canonical state metadata. The us-atlas TopoJSON identifies states by their
// 2-character FIPS code (e.g. California = "06"). The unitedstates/congress
// data source identifies legislators by 2-letter USPS code (CA). Every join
// between the map and the political data goes through this table.
//
// Includes DC (a non-state with no voting representation in Congress but
// rendered on the map) and all 50 states. Excludes US territories — the
// us-atlas 10m TopoJSON does not include PR, GU, AS, MP, VI, and Congress
// has only delegate representation from them.

export type StateRecord = {
  fips: string; // zero-padded 2-char FIPS code matching us-atlas TopoJSON ids
  code: string; // 2-letter USPS code matching congress-legislators data
  name: string;
};

export const STATES: StateRecord[] = [
  { fips: "01", code: "AL", name: "Alabama" },
  { fips: "02", code: "AK", name: "Alaska" },
  { fips: "04", code: "AZ", name: "Arizona" },
  { fips: "05", code: "AR", name: "Arkansas" },
  { fips: "06", code: "CA", name: "California" },
  { fips: "08", code: "CO", name: "Colorado" },
  { fips: "09", code: "CT", name: "Connecticut" },
  { fips: "10", code: "DE", name: "Delaware" },
  { fips: "11", code: "DC", name: "District of Columbia" },
  { fips: "12", code: "FL", name: "Florida" },
  { fips: "13", code: "GA", name: "Georgia" },
  { fips: "15", code: "HI", name: "Hawaii" },
  { fips: "16", code: "ID", name: "Idaho" },
  { fips: "17", code: "IL", name: "Illinois" },
  { fips: "18", code: "IN", name: "Indiana" },
  { fips: "19", code: "IA", name: "Iowa" },
  { fips: "20", code: "KS", name: "Kansas" },
  { fips: "21", code: "KY", name: "Kentucky" },
  { fips: "22", code: "LA", name: "Louisiana" },
  { fips: "23", code: "ME", name: "Maine" },
  { fips: "24", code: "MD", name: "Maryland" },
  { fips: "25", code: "MA", name: "Massachusetts" },
  { fips: "26", code: "MI", name: "Michigan" },
  { fips: "27", code: "MN", name: "Minnesota" },
  { fips: "28", code: "MS", name: "Mississippi" },
  { fips: "29", code: "MO", name: "Missouri" },
  { fips: "30", code: "MT", name: "Montana" },
  { fips: "31", code: "NE", name: "Nebraska" },
  { fips: "32", code: "NV", name: "Nevada" },
  { fips: "33", code: "NH", name: "New Hampshire" },
  { fips: "34", code: "NJ", name: "New Jersey" },
  { fips: "35", code: "NM", name: "New Mexico" },
  { fips: "36", code: "NY", name: "New York" },
  { fips: "37", code: "NC", name: "North Carolina" },
  { fips: "38", code: "ND", name: "North Dakota" },
  { fips: "39", code: "OH", name: "Ohio" },
  { fips: "40", code: "OK", name: "Oklahoma" },
  { fips: "41", code: "OR", name: "Oregon" },
  { fips: "42", code: "PA", name: "Pennsylvania" },
  { fips: "44", code: "RI", name: "Rhode Island" },
  { fips: "45", code: "SC", name: "South Carolina" },
  { fips: "46", code: "SD", name: "South Dakota" },
  { fips: "47", code: "TN", name: "Tennessee" },
  { fips: "48", code: "TX", name: "Texas" },
  { fips: "49", code: "UT", name: "Utah" },
  { fips: "50", code: "VT", name: "Vermont" },
  { fips: "51", code: "VA", name: "Virginia" },
  { fips: "53", code: "WA", name: "Washington" },
  { fips: "54", code: "WV", name: "West Virginia" },
  { fips: "55", code: "WI", name: "Wisconsin" },
  { fips: "56", code: "WY", name: "Wyoming" },
];

const FIPS_TO_RECORD = new Map(STATES.map((s) => [s.fips, s]));
const CODE_TO_RECORD = new Map(STATES.map((s) => [s.code, s]));

export function stateByFips(fips: string): StateRecord | undefined {
  // Some sources emit FIPS as numbers; normalize to 2-char string with leading zero.
  const padded = String(fips).padStart(2, "0");
  return FIPS_TO_RECORD.get(padded);
}

export function stateByCode(code: string): StateRecord | undefined {
  return CODE_TO_RECORD.get(code.toUpperCase());
}
