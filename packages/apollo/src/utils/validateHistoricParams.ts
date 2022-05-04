import { duration } from "moment";
import { graphqlTypes } from "apollo-language-server";

export function validateHistoricParams({
  validationPeriod,
  queryCountThreshold,
  queryCountThresholdPercentage,
}: Partial<{
  validationPeriod: string;
  queryCountThreshold: number;
  queryCountThresholdPercentage: number;
}>): Partial<graphqlTypes.HistoricQueryParameters> | null {
  if (
    !validationPeriod &&
    !queryCountThreshold &&
    !queryCountThresholdPercentage
  ) {
    return null;
  }

  let from: number | null = null;
  if (validationPeriod) {
    // Validation period can be one of two things:
    // 1) a number in seconds
    // 2) an ISO 8601 formatted duration, i.e. "P1D", "P10DT1H", "PT6H"
    from = isNumeric(validationPeriod)
      ? -1 * duration(Number(validationPeriod), "seconds").asSeconds()
      : -1 * duration(validationPeriod).asSeconds();

    if (from >= 0) {
      throw new Error(
        "Please provide a valid duration for the --validationPeriod flag. Valid durations are represented in ISO 8601, see: https://go.apollo.dev/t/iso-durations."
      );
    }
  }

  if (
    queryCountThreshold &&
    (!Number.isInteger(queryCountThreshold) || queryCountThreshold < 1)
  ) {
    throw new Error(
      "Please provide a valid number for the --queryCountThreshold flag. Valid numbers are integers in the range x >= 1."
    );
  }

  let asPercentage: number | null = null;
  if (queryCountThresholdPercentage) {
    if (
      queryCountThresholdPercentage < 0 ||
      queryCountThresholdPercentage > 100
    ) {
      throw new Error(
        "Please provide a valid number for the --queryCountThresholdPercentage flag. Valid numbers are in the range 0 <= x <= 100."
      );
    }
    asPercentage = queryCountThresholdPercentage / 100;
  }

  return {
    ...(from && { to: -0, from }),
    ...(queryCountThreshold && { queryCountThreshold }),
    ...(asPercentage && { queryCountThresholdPercentage: asPercentage }),
  };
}

function isNumeric(maybeNumber: string) {
  return !Number.isNaN(Number(maybeNumber));
}
