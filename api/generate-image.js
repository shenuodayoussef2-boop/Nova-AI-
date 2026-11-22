
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "GEMINI_API_KEY is missing"
    });
  }

  try {
    const { prompt, aspectRatio = "1:1" } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "اكتب وصف الصورة أولاً"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Image generation failed"
      });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const image = parts.find(p => p.inlineData?.data);

    if (!image) {
      return res.status(502).json({
        error: "لم يتم إنشاء صورة"
      });
    }

    return res.status(200).json({
      image: `data:${image.inlineData.mimeType};base64,${image.inlineData.data}`
    });

  } catch (error) {
    return res.status(500).json({
      error: "حدث خطأ أثناء إنشاء الصورة"
    });
  }
}
