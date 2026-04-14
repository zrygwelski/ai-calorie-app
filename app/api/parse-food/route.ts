import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { input } = await req.json();

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You are a nutrition assistant.

Convert food descriptions into JSON with:
- name
- quantity
- calories
- protein
- carbs
- fat

Return ONLY valid JSON.
        `,
      },
      {
        role: "user",
        content: input,
      },
    ],
  });

  const text = response.choices[0].message.content;

  return Response.json({ result: text });
}