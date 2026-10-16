export function callDateContext(timeZone: string, now = new Date()) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    throw new Error(
      "The workspace time zone is invalid. Ask the owner to correct it before interpreting dates.",
    );
  }
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const calendar = new Date(`${today}T00:00:00.000Z`);
  const names = [
    ["Sunday", "الأحد"],
    ["Monday", "الاثنين"],
    ["Tuesday", "الثلاثاء"],
    ["Wednesday", "الأربعاء"],
    ["Thursday", "الخميس"],
    ["Friday", "الجمعة"],
    ["Saturday", "السبت"],
  ];
  return {
    today,
    timeZone,
    weekdays: names.map(([en, ar], day) => {
      const daysUntil = (day - calendar.getUTCDay() + 7) % 7;
      return {
        en,
        ar,
        daysUntil,
        date: new Date(calendar.getTime() + daysUntil * 86400000)
          .toISOString()
          .slice(0, 10),
      };
    }),
  };
}
