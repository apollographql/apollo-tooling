import { validateHistoricParams } from "..";

describe("validateHistoricParams", () => {
  it("generates valid params with valid input", () => {
    // Providing a number in seconds
    expect(getValidParams("86400")).toEqual({
      to: -0,
      from: -86400,
      queryCountThreshold: 1,
      queryCountThresholdPercentage: 0.5,
    });

    // Providing an ISO 8601 formatted duration
    expect(getValidParams("P1D")).toEqual({
      to: -0,
      from: -86400,
      queryCountThreshold: 1,
      queryCountThresholdPercentage: 0.5,
    });
  });

  it("throws an error with invalid input", () => {
    // Period must be > 0
    expect(() =>
      validateHistoricParams({
        validationPeriod: "0",
        queryCountThreshold: 1,
        queryCountThresholdPercentage: 50,
      })
    ).toThrow(/--validationPeriod/);

    // Count threshold must be an integer >= 1
    expect(() =>
      validateHistoricParams({
        validationPeriod: "P1D",
        queryCountThreshold: 0.5,
        queryCountThresholdPercentage: 50,
      })
    ).toThrow(/--queryCountThreshold/);

    // Count threshold percentage must be an integer 0 <= x <= 100
    expect(() =>
      validateHistoricParams({
        validationPeriod: "P1D",
        queryCountThreshold: 1,
        queryCountThresholdPercentage: 101,
      })
    ).toThrow(/--queryCountThresholdPercentage/);
  });

  it("handles partial input", () => {
    expect(validateHistoricParams({})).toEqual(null);

    expect(
      validateHistoricParams({
        validationPeriod: "P1D",
      })
    ).toEqual({ to: -0, from: -86400 });

    expect(
      validateHistoricParams({
        queryCountThreshold: 1,
      })
    ).toEqual({ queryCountThreshold: 1 });

    expect(
      validateHistoricParams({
        queryCountThresholdPercentage: 50,
      })
    ).toEqual({ queryCountThresholdPercentage: 0.5 });

    expect(
      validateHistoricParams({
        validationPeriod: "P1D",
        queryCountThresholdPercentage: 50,
      })
    ).toEqual({ to: -0, from: -86400, queryCountThresholdPercentage: 0.5 });
  });
});

function getValidParams(validationPeriod: string) {
  return validateHistoricParams({
    validationPeriod,
    queryCountThreshold: 1,
    queryCountThresholdPercentage: 50,
  });
}
