import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function summarizeWithOpenAI(text: string) {
  if (!process.env.OPENAI_API_KEY) return null;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content:
          "Summarize this news item in 1-3 concise sentences:\n\n" + text,
      },
    ],
    temperature: 0.2,
  });

  return res.choices[0]?.message?.content ?? null;
}