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
          
          Your job is to convert a user's food description into structured nutrition data.
          
          Rules:
          - Always return valid JSON.
          - Do NOT include markdown, code blocks, or explanations.
          - Only return JSON.
          
          Output format:
          {
            "items": [
              {
                "name": "string",
                "quantity": "string",
                "calories": number,
                "protein": number,
                "carbs": number,
                "fat": number
              }
            ]
          }
          
          Guidelines:
          - Split multiple foods into separate items.
            Example: "2 eggs and toast" → 2 items (eggs, toast)
          
          - Quantities should be human-readable:
            Examples: "2 eggs", "1 slice", "0.5 lb", "1 cup"
          
          - Nutrition values should represent the TOTAL for that item (not per-unit).
          
          - If the food is complex (e.g. meatloaf, casserole, pasta dish):
            - Use a reasonable average estimate
            - Do NOT break into ingredients
            - Prefer simplicity over precision
          
          - If quantity is unclear, assume a reasonable portion.
          
          - Carbs can be 0 if appropriate.
          
          - Always include all fields (calories, protein, carbs, fat)
          
          - Round values to reasonable whole numbers.
          
          Goal:
          Be fast, simple, and reasonably accurate. Do not overthink.
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