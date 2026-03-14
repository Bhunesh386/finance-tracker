/**
 * Fetches AI insights from OpenRouter API using Gemma-3 model.
 * @param {Array} transactions - List of transactions from the last 60 days
 * @returns {Promise<Array>} List of generated insights objects { title, description, type }
 */
export const generateInsights = async (transactions) => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key is missing");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://finance-tracker.vercel.app",
      "X-Title": "Finance Tracker"
    },
    body: JSON.stringify({
      model: "google/gemma-3-27b-it:free",
      messages: [
        {
          role: "system",
          content: "You are a personal finance advisor. Analyze the user's transaction data and give exactly 5 clear, specific, actionable insights in plain language. Format each insight as a JSON object with fields: title (short, max 6 words), description (2 sentences max), type ('warning' | 'tip' | 'positive'). Return a JSON array only, no markdown, no extra text."
        },
        {
          role: "user",
          content: `Here are my transactions from the last 60 days: ${JSON.stringify(transactions)}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate insights: ${response.statusText}`);
  }

  const data = await response.json();
  const insightsText = data.choices[0].message.content;

  try {
    const jsonMatch = insightsText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(insightsText);
  } catch (err) {
    console.error("Failed to parse AI insights as JSON:", insightsText);
    throw new Error("Invalid response format from AI.");
  }
};
