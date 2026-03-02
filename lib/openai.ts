import OpenAI from "openai";

import { sleep } from "./rate-limit";

const MAX_RETRIES = 2;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({ apiKey });
}

export async function summarizeWithOpenAI(text: string) {
  const client = getClient();
  if (!client) return null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Summarize this news item in 1-3 concise sentences:\n\n" + text,
          },
        ],
        temperature: 0.2,
      });

      return res.choices[0]?.message?.content ?? null;
    } catch (error: any) {
      const status = error?.status;
      if (status === 429 || status === 403) {
        if (attempt === MAX_RETRIES) return null;

        const retryAfterHeader = error?.headers?.["retry-after"];
        const retryAfterMs = Number(retryAfterHeader) > 0 ? Number(retryAfterHeader) * 1000 : 0;
        const backoffMs = retryAfterMs || (attempt + 1) * 1000;
        await sleep(backoffMs);
        continue;
      }

      return null;
    }
  }

  return null;
}
