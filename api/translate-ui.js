export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "POST only"
        });
    }

    try {
        const {
            language,
            texts
        } = req.body || {};

        if (
            typeof language !== "string" ||
            !Array.isArray(texts)
        ) {
            return res.status(400).json({
                error: "Invalid translation data"
            });
        }

        if (!texts.length) {
            return res.status(200).json({
                translations: {}
            });
        }

        const keys = (process.env.GEMINI_API_KEY || "")
            .split(",")
            .map(k => k.trim())
            .filter(Boolean);

        if (!keys.length) {
            return res.status(500).json({
                error: "No Gemini API keys configured"
            });
        }

        const prompt = `
You are the UI localization engine for Nova AI.

Translate the following user interface strings into:
${language}

Rules:
- Return ONLY valid JSON.
- Return an object where every original string is a key.
- Do not add explanations.
- Do not translate product names such as "Nova AI".
- Preserve emojis.
- Preserve punctuation where natural.
- Keep translations natural and native.
- Do not translate user chat messages, only UI labels.
- For ar-eg use natural Egyptian Arabic.
- For ar-ma use Moroccan Darija.
- For fa use natural Persian.
- For ur use natural Urdu.

Input strings:
${JSON.stringify(texts)}
`;

        let lastError = null;

        for (const apiKey of keys) {
            try {
                const response = await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-goog-api-key": apiKey
                        },
                        body: JSON.stringify({
                            systemInstruction: {
                                parts: [
                                    {
                                        text:
                                            "You translate Nova AI interface text and must output only JSON."
                                    }
                                ]
                            },
                            contents: [
                                {
                                    role: "user",
                                    parts: [
                                        {
                                            text: prompt
                                        }
                                    ]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.2,
                                maxOutputTokens: 8192
                            }
                        })
                    }
                );

                const raw = await response.text();

                if (!response.ok) {
                    lastError = new Error(raw);
                    continue;
                }

                let data;

                try {
                    data = JSON.parse(raw);
                } catch {
                    lastError = new Error(
                        "Gemini returned invalid JSON"
                    );
                    continue;
                }

                const generatedText =
                    data?.candidates?.[0]?.content?.parts
                        ?.map(part => part?.text || "")
                        .join("")
                        .trim();

                if (!generatedText) {
                    lastError = new Error(
                        "Empty Gemini translation"
                    );
                    continue;
                }

                const cleaned = generatedText
                    .replace(/^```json\s*/i, "")
                    .replace(/^```\s*/i, "")
                    .replace(/\s*```$/i, "")
                    .trim();

                let translations;

                try {
                    translations = JSON.parse(cleaned);
                } catch {
                    lastError = new Error(
                        "Translation JSON parse failed"
                    );
                    continue;
                }

                if (
                    !translations ||
                    typeof translations !== "object"
                ) {
                    lastError = new Error(
                        "Invalid translation object"
                    );
                    continue;
                }

                return res.status(200).json({
                    language,
                    translations
                });

            } catch (error) {
                lastError = error;
            }
        }

        return res.status(500).json({
            error:
                lastError?.message ||
                "Translation failed"
        });

    } catch (error) {
        console.error(
            "Nova UI Translation Error:",
            error
        );

        return res.status(500).json({
            error: "Internal server error"
        });
    }
}
