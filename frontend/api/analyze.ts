import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const client = new Anthropic();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { payrollData } = req.body ?? {};
  if (!payrollData) {
    return res.status(400).json({ error: "Missing payrollData" });
  }

  const prompt = `You are a payroll analyst for a crypto-native company using Aleo blockchain.

Analyze the following payroll data and return a JSON object with:
- anomalies: array of { title, description, severity ("high"|"medium"|"low") }
- insights: array of { title, description }
- recommendations: array of { title, description }

Focus on: salary outliers, payment type distribution, employees not paid recently, streaming vs lump-sum balance.
Keep each item concise (1-2 sentences max).

Payroll data:
${JSON.stringify(payrollData, null, 2)}

Respond ONLY with valid JSON matching the schema above.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const analysis = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ analysis });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return res.status(500).json({ error: msg });
  }
}
