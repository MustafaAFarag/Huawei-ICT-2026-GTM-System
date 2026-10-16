import type { Evidence, ProspectSnapshot, Touch } from "@revenue/contracts";

const numbers = (text: string) =>
  text
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
    .replace(/(?<=\d)[,٬](?=\d{3}(?:\D|$))/g, "")
    .match(/\d+(?:[.٫]\d+)?/g)
    ?.map((value) => String(Number(value.replace("٫", ".")))) ?? [];

const wordNumbers: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  million: 1000000,
  billion: 1000000000,
};
const numberWord = Object.keys(wordNumbers).join("|");
function sourceNumbers(text: string) {
  const result = numbers(text);
  for (const match of text
    .toLowerCase()
    .matchAll(
      new RegExp(
        `\\b(?:${numberWord})(?:[ -]+(?:and[ -]+)?(?:${numberWord}))*\\b`,
        "g",
      ),
    )) {
    let total = 0,
      current = 0;
    for (const word of match[0].split(/[ -]+/)) {
      const value = wordNumbers[word];
      if (value === undefined) continue;
      result.push(String(value));
      if (value === 100) current = Math.max(1, current) * 100;
      else if (value >= 1000) {
        total += Math.max(1, current) * value;
        current = 0;
      } else current += value;
    }
    result.push(String(total + current));
  }
  return result;
}

// Cheap checks for observed errors, not a semantic-entailment or name-recognition judge.
// Number reuse in a different meaning and written-out numbers still need human review.
export function validateDraftContent(
  touches: Touch[],
  snapshot: ProspectSnapshot,
  facts: Evidence[],
  offer: string,
) {
  const firstName = snapshot.firstName.trim();
  if (firstName && !touches[0]?.body.includes(firstName))
    throw new Error(
      "The generated email did not preserve the recipient's first name. Review the draft and retry.",
    );
  const allowed = new Set(
    sourceNumbers(
      [
        snapshot.firstName,
        snapshot.lastName,
        snapshot.company,
        offer,
        ...facts.map((fact) => `${fact.claim}\n${fact.date}`),
      ].join("\n"),
    ),
  );
  if (
    touches.some((touch) =>
      numbers(`${touch.subject ?? ""}\n${touch.body}`).some(
        (value) => !allowed.has(value),
      ),
    )
  )
    throw new Error(
      "The generated draft added an unsupported number. Review the sources and retry.",
    );
}
