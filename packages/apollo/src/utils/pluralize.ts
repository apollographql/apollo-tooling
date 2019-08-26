import stripANSI from "strip-ansi";

export function pluralize(
  quantity: string | number | null,
  singular: string,
  plural: string = `${singular}s`
) {
  // Strip ansi color from `quantity` if it's a string
  const strippedQuantity =
    typeof quantity === "string" ? parseInt(stripANSI(quantity), 0) : quantity;

  return `${quantity} ${strippedQuantity === 1 ? singular : plural}`;
}
