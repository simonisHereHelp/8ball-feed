import { NextResponse } from "next/server";

import { fetchRss } from "../../../lib/rss";
import { formatLine, stripHtml } from "../../../lib/format";
import { summarizeWithOpenAI } from "../../../lib/openai";
import { mapWithConcurrency } from "../../../lib/rate-limit";

export const runtime = "nodejs";

const FEEDS = [
  "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml",
  "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml",
  "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml",
  "https://www.drugs.com/feeds/fda_alerts.xml",
  "https://www.drugs.com/feeds/clinical_trials.xml",
  "https://www.drugs.com/feeds/medical_news.xml",
  "https://www.verdict.co.uk/medical-devices/feed/",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "80");

  const fetched = await Promise.allSettled(FEEDS.map((u) => fetchRss(u)));

  const items = fetched.flatMap((res, i) => {
    if (res.status !== "fulfilled") return [];
    return res.value.map((it) => ({
      feedUrl: FEEDS[i],
      source: it.sourceTitle ?? FEEDS[i],
      title: it.title,
      url: it.link,
      date: it.pubDate ? it.pubDate.toISOString() : null,
      snippet: it.contentSnippet ?? "",
    }));
  });

  // dedupe by URL
  const byUrl = new Map<string, any>();
  for (const it of items) {
    if (!it.url) continue;
    if (!byUrl.has(it.url)) byUrl.set(it.url, it);
  }

  const deduped = Array.from(byUrl.values())
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, limit);

  const enriched = await mapWithConcurrency(
    deduped,
    async (it) => {
      const cleaned = stripHtml(it.snippet);
      const ai = await summarizeWithOpenAI(`${it.title}\n\n${cleaned}\n\n${it.url}`);
      const summary = ai ?? cleaned;

      return {
        ...it,
        summary,
        formatted: formatLine({
          title: it.title,
          date: it.date ? new Date(it.date) : null,
          tzLabel: "UTC",
          summary,
          url: it.url,
        }),
      };
    },
    2
  );

  return NextResponse.json({ sources: FEEDS, count: enriched.length, feed: enriched });
}