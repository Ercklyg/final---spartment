const TIMEOUT_MS = 6000;

async function requestOnce({ apiKey, model, prompt }) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 900, temperature: 0.2 },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.error?.message || 'AI request failed.');
      error.status = response.status;
      error.code = data?.error?.status;
      throw error;
    }
    return data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  } finally {
    clearTimeout(timer);
  }
}

// The service can try its fallback model immediately. Do not hold the dashboard
// open for a long busy-provider sleep and retry the same model.
export const generateContent = requestOnce;
