/** First letter of the first two words, uppercased (e.g. "Coastal Power" -> "CP"). */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
