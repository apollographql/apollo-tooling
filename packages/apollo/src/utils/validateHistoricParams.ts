import { HistoricQueryParameters } from "apollo-language-server/lib/engine/operations/checkSchema";
import { duration } from "moment";

export function validateHistoricParams({
  validationPeriod,
  queryCountThreshold,
  queryCountThresholdPercentage
}: {
  validationPeriod: string;
  queryCountThreshold: number;
  queryCountThresholdPercentage: number;
}): HistoricQueryParameters {
  // Validation period can be one of two things:
  // 1) a number in seconds
  // 2) an ISO 8601 formatted duration, i.e. "P1D", "P10DT1H", "PT6H"
  const from = isNumeric(validationPeriod)
    ? -1 * duration(Number(validationPeriod), "seconds").asSeconds()
    : -1 * duration(validationPeriod).asSeconds();

  if (from >= 0) {
    throw new Error(
      "Please provide a valid duration for the --validationPeriod flag. Valid durations are represented in ISO 8601, see: https://bit.ly/2DEJ3UN."
    );
  }

  if (!Number.isInteger(queryCountThreshold) || queryCountThreshold < 1) {
    throw new Error(
      "Please provide a valid number for the --queryCountThreshold flag. Valid numbers are integers in the range x >= 1."
    );
  }

  if (
    queryCountThresholdPercentage < 0 ||
    queryCountThresholdPercentage > 100
  ) {
    throw new Error(
      "Please provide a valid number for the --queryCountThresholdPercentage flag. Valid numbers are in the range 0 <= x <= 100."
    );
  }

  const asPercentage = queryCountThresholdPercentage / 100;

  return {
    to: -0,
    from,
    queryCountThreshold,
    queryCountThresholdPercentage: asPercentage
  };
}

function isNumeric(maybeNumber: string) {
  return !Number.isNaN(Number(maybeNumber));
}
