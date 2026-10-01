import { expect, test } from "vitest";
import { CANDIDATE_CODE_RE, formatCandidateCode } from "./constants";

test("candidate codes are prefix + 6 zero-padded digits", () => {
  expect(formatCandidateCode("SV", 182)).toBe("SV000182");
  expect(formatCandidateCode("AZ", 123456)).toBe("AZ123456");
  expect(formatCandidateCode("SV", 1)).toMatch(CANDIDATE_CODE_RE);
  expect("sv000182").not.toMatch(CANDIDATE_CODE_RE);
  expect("SV0001820").not.toMatch(CANDIDATE_CODE_RE);
});
