export function formatLine(opts: {
  title: string;
  date: Date | null;
  tzLabel?: string; // e.g. "PST"
  summary?: string;
  url: string;
}) {
  const d = opts.date
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(opts.date)
    : "Unknown date";

  const t = opts.date
    ? new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(opts.date)
    : "";

  const when = opts.date ? `${d}, ${t}${opts.tzLabel ? ` ${opts.tzLabel}` : ""}` : d;

  return `${opts.title} (${when})\n\n${(opts.summary ?? "").trim()}\n\n${opts.url}\n`;
}

export function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}