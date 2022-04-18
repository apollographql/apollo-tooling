import { formatMS } from "../format";

const SECOND_AS_MS = 1000;
const MIN_AS_MS = 60 * SECOND_AS_MS;
const HOUR_AS_MS = 60 * MIN_AS_MS;

describe("formatMS", () => {
  describe("hours display", () => {
    it("works with no digits", () => {
      const value = 2 * HOUR_AS_MS;
      expect(formatMS(value, 0)).toEqual("2hr");
    });

    it("works with 1 digit", () => {
      const value = 2 * HOUR_AS_MS;
      expect(formatMS(value, 1)).toEqual("2.0hr");
    });
  });

  describe("minutes display", () => {
    it("works with no digits", () => {
      const value = 3 * MIN_AS_MS;
      expect(formatMS(value, 0)).toEqual("3min");
    });

    it("works with 1 digit", () => {
      const value = 3 * MIN_AS_MS;
      expect(formatMS(value, 1)).toEqual("3.0min");
    });
  });

  describe("seconds display", () => {
    it("works with no digits", () => {
      const value = 4 * SECOND_AS_MS;
      expect(formatMS(value, 0)).toEqual("4s");
    });

    it("works with 1 digit", () => {
      const value = 4 * SECOND_AS_MS;
      expect(formatMS(value, 1)).toEqual("4.0s");
    });
  });
});
