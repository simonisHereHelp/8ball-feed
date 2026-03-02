import Parser from "rss-parser";

export type RssItem = {
  title: string;
  link: string;
  pubDate: Date | null;
  contentSnippet?: string;
  sourceTitle?: string;
};

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent": "news-tracker/1.0 (+rss parser)",
  },
});

export async function fetchRss(url: string): Promise<RssItem[]> {
  const feed = await parser.parseURL(url);
  return (feed.items ?? []).map((it) => ({
    title: it.title ?? "(no title)",
    link: it.link ?? "",
    pubDate: it.pubDate ? new Date(it.pubDate) : null,
    contentSnippet: (it.contentSnippet ?? it.content ?? "").toString(),
    sourceTitle: feed.title ?? url,
  }));
}