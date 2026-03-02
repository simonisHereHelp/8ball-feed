import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

import { formatLine } from "../../../lib/format";
import { summarizeWithOpenAI } from "../../../lib/openai";
import { mapWithConcurrency, sleep } from "../../../lib/rate-limit";

export const runtime = "nodejs";

const TrickerSchema = z.object({
  tricker: z.string(),
  name: z.string().optional(),
});

type FinnhubItem = {
  id: number;
  headline: string;
  datetime: number; // unix seconds
  summary: string;
  url: string;
  source: string;
};

function ymd(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchFinnhubNews(url: string) {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) {
      return response.json() as Promise<FinnhubItem[]>;
    }

    const body = (await response.text()).slice(0, 200);
    if ((response.status === 429 || response.status === 403) && attempt < maxRetries) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 1200;
      await sleep(waitMs);
      continue;
    }

    throw new Error(`Finnhub HTTP ${response.status}: ${body}`);
  }

  return [];
}

export async function GET(req: Request) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing FINNHUB_API_KEY" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "3");
  const limit = Number(searchParams.get("limit") ?? "50");
  const symbolsParam = searchParams.get("symbols"); // "AMZN,TSLA"

  const jsonPath = path.join(process.cwd(), "data", "trickers.json");
  const raw = await fs.readFile(jsonPath, "utf-8");
  const list = z.array(TrickerSchema).parse(JSON.parse(raw));

  const symbols = (symbolsParam ? symbolsParam.split(",") : list.map((x) => x.tricker))
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const fromStr = ymd(from);
  const toStr = ymd(to);

  const results: Array<{
    tricker: string;
    items: Array<{
      title: string;
      date: string | null;
      url: string;
      summary: string;
      formatted: string;
      source: string;
    }>;
    error?: string;
  }> = [];

  for (const sym of symbols) {
    try {
      const url = new URL("https://finnhub.io/api/v1/company-news");
      url.searchParams.set("symbol", sym);
      url.searchParams.set("from", fromStr);
      url.searchParams.set("to", toStr);
      url.searchParams.set("token", apiKey);

      const data = await fetchFinnhubNews(url.toString());

      const trimmed = data.slice(0, limit).map((it) => {
        const dt = it.datetime ? new Date(it.datetime * 1000) : null;
        return {
          title: it.headline ?? "(no headline)",
          date: dt ? dt.toISOString() : null,
          url: it.url ?? "",
          summary: it.summary ?? "",
          source: it.source ?? "Finnhub",
        };
      });

      const enriched = await mapWithConcurrency(
        trimmed,
        async (it) => {
          const ai = await summarizeWithOpenAI(`${it.title}\n\n${it.summary}\n\n${it.url}`);
          const summary = ai ?? it.summary;

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

      results.push({ tricker: sym, items: enriched });
    } catch (e: any) {
      results.push({ tricker: sym, items: [], error: e?.message ?? "Unknown error" });
    }

    await sleep(1100);
  }

  const feed = results
    .flatMap((r) => r.items.map((it) => ({ tricker: r.tricker, ...it })))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return NextResponse.json({ from: fromStr, to: toStr, results, feed });
}
