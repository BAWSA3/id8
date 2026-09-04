import "server-only";

/* The desk writes plain sentences. No em dashes, en dashes, or double hyphens
   reach the trader, whatever the model felt like typing. */
export function plain(text: string): string {
  return text
    .replace(/\s*(?:—|–|--)\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/([.!?:;])\s*,\s*/g, "$1 ")
    .replace(/\s+([.!?])/g, "$1")
    .trim()
    .replace(/,$/, ".");
}
