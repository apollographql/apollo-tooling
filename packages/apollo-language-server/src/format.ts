const ONE_SECOND_AS_MS = 1000;
const ONE_MINUTE_AS_MS = 60 * ONE_SECOND_AS_MS;
const ONE_HOUR_AS_MS = 60 * ONE_MINUTE_AS_MS;

export function formatMS(
  ms: number,
  d: number,
  allowMicros = false,
  allowNanos = true
) {
  if (ms === 0 || ms === null) return "0";
  const bounds = [
    ONE_HOUR_AS_MS,
    ONE_MINUTE_AS_MS,
    ONE_SECOND_AS_MS,
    1,
    0.001,
    0.000001,
  ];
  const units = ["hr", "min", "s", "ms", "μs", "ns"];

  const makeSmallNumbersNice = (f: number) => {
    if (f >= 100) return f.toFixed(0);
    if (f >= 10) return f.toFixed(1);
    if (f === 0) return "0";
    return f.toFixed(2);
  };

  const bound = bounds.find((b) => b <= ms) || bounds[bounds.length - 1];
  const boundIndex = bounds.indexOf(bound);
  const unit = boundIndex >= 0 ? units[boundIndex] : "";

  if ((unit === "μs" || unit === "ns") && !allowMicros) {
    return "< 1ms";
  }
  if (unit === "ns" && !allowNanos) {
    return "< 1µs";
  }
  const value =
    typeof d !== "undefined"
      ? (ms / bound).toFixed(d)
      : makeSmallNumbersNice(ms / bound);

  // if something is rounded to 1000 and not reduced this will catch and reduce it
  if ((value === "1000" || value === "1000.0") && boundIndex >= 1) {
    return `1${units[boundIndex - 1]}`;
  }

  return `${value}${unit}`;
}
