// Gemini AI service for humanity verification
// Uses Google Gemini API via REST (no npm package dependency)

interface GeminiResponse {
  isHuman: boolean;
  humanityScore: number;
  comment: string;
}

/**
 * Validates a user's philosophical answer to determine if they are likely human.
 * We ask the model to be a strict judge of creativity and nuance.
 */
export const verifyHumanityWithGemini = async (
  question: string,
  answer: string
): Promise<{ success: boolean; feedback: string; score: number }> => {
  try {
    // Get API key from environment or localStorage
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                   import.meta.env.GEMINI_API_KEY || 
                   localStorage.getItem('gemini_api_key') || '';
    
    if (!apiKey) {
      // Silent fallback: simple heuristic check (no console warning to reduce noise)
      return {
        success: answer.length > 10 && answer.length < 2000,
        feedback: "Basic validation passed. For enhanced verification, configure VITE_GEMINI_API_KEY in your .env file.",
        score: answer.length > 10 ? 70 : 30
      };
    }

    const model = 'gemini-pro';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
      You are the Gatekeeper of VERIF, a strict digital entity verifier. 
      Your goal is to distinguish between a human giving a nuanced, imperfect, or creative answer, 
      and a bot/AI giving a generic, wikipedia-style, or overly polished answer.

      The Challenge Question: "${question}"
      The User's Answer: "${answer}"

      Analyze the answer. 
      1. If it feels too generic, copy-pasted, or lacks "soul", reject it.
      2. If it has typos that look human, slang, unique perspective, or emotional weight, accept it.
      
      Return a JSON object with this exact schema:
      {
        "isHuman": boolean,
        "humanityScore": number (0-100),
        "comment": "A short, dry, witty remark about their answer in English language."
      }
      
      Do not output markdown code blocks. Just the JSON.
    `;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Gemini] API Error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Try to extract JSON from response (might have markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const result: GeminiResponse = JSON.parse(jsonText);

    return {
      success: result.isHuman && result.humanityScore > 60,
      feedback: result.comment || "Evaluation complete",
      score: result.humanityScore || 0
    };

  } catch (error) {
    console.error("[Gemini] Verification failed:", error);
    
    // Fallback: basic heuristic validation
    const isValidLength = answer.length > 10 && answer.length < 2000;
    const hasVariety = new Set(answer.toLowerCase().split(' ')).size > 5;
    
    return {
      success: isValidLength && hasVariety,
      feedback: error instanceof Error ? `System error: ${error.message}` : "System overloaded. Please try again later.",
      score: isValidLength && hasVariety ? 65 : 35
    };
  }
};

