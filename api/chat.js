
'use strict';

// ==========================================
// YOVIA AI - CHAT API
// Supabase Authentication + Daily Quotas
// Centralized Gemini API
// ==========================================

// ==========================================
// ENVIRONMENT
// ==========================================

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// ==========================================
// SYSTEM PROMPT
// ==========================================

const SYSTEM_PROMPT = `
أنت Yovia AI، مساعد ذكي متعدد اللغات.

- اسمك Yovia.
- افهم لغة المستخدم ورد باللغة نفسها وبلهجته قدر الإمكان.
- إذا سُئلت عن اسمك فقل: أنا Yovia.
- إذا سُئلت عن مطوّر Yovia فقل: المطوّر هو يوسف.
- لا تقل إنك Nova أو Gemini أو Google.
- حافظ على سياق المحادثة.
- لا تخترع معلومات أو تدّعي تنفيذ شيء لم تنفذه.
- كن واضحًا ومباشرًا.
`;

// ==========================================
// RESPONSE HELPER
// ==========================================

function send(res, status, payload) {
  return res.status(status).json(payload);
}

// ==========================================
// JSON HELPER
// ==========================================

async function readJSON(response) {
  const raw = await response.text();

  if (!raw) {
    return {
      raw: '',
      data: null
    };
  }

  try {
    return {
      raw,
      data: JSON.parse(raw)
    };
  } catch {
    return {
      raw,
      data: null
    };
  }
}

// ==========================================
// NORMALIZE MESSAGES
// ==========================================

function normalizeMessages(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter(message =>
      message &&
      typeof message === 'object' &&
      message.role !== 'system'
    )
    .map(message => {
      const role =
        message.role === 'assistant' ||
        message.role === 'model'
          ? 'model'
          : 'user';

      let content = '';

      if (typeof message.content === 'string') {
        content = message.content;
      } else if (typeof message.text === 'string') {
        content = message.text;
      } else if (Array.isArray(message.content)) {
        content = message.content
          .map(part => {
            if (typeof part === 'string') {
              return part;
            }

            if (part && typeof part.text === 'string') {
              return part.text;
            }

            return '';
          })
          .filter(Boolean)
          .join('\n');
      }

      content = String(content || '').trim();

      if (!content) {
        return null;
      }

      return {
        role,
        parts: [
          {
            text: content
          }
        ]
      };
    })
    .filter(Boolean)
    .slice(-40);
}

// ==========================================
// MAIN HANDLER
// ==========================================

module.exports = async function handler(req, res) {

  // ========================================
  // CORS
  // ========================================

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return send(res, 405, {
      error: 'POST only',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // اسم المرحلة لتحديد مكان الخطأ
  let stage = 'initialization';

  try {

    // ======================================
    // ENVIRONMENT CHECK
    // ======================================

    stage = 'environment';

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return send(res, 500, {
        error: 'إعدادات Supabase ناقصة على الخادم.',
        code: 'SUPABASE_CONFIG_ERROR'
      });
    }

    if (!GEMINI_API_KEY) {
      return send(res, 500, {
        error: 'مفتاح Gemini غير مضبوط على الخادم.',
        code: 'MISSING_GEMINI_API_KEY'
      });
    }

    // ======================================
    // AUTHENTICATION HEADER
    // ======================================

    stage = 'authentication_header';

    const authHeader = req.headers.authorization || '';

    if (!/^Bearer\s+\S+/i.test(authHeader)) {
      return send(res, 401, {
        error: 'جلسة المستخدم غير موجودة.',
        code: 'UNAUTHENTICATED'
      });
    }

    // ======================================
    // REQUEST BODY
    // ======================================

    stage = 'request_body';

    let body = req.body || {};

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return send(res, 400, {
          error: 'بيانات الطلب غير صالحة.',
          code: 'INVALID_JSON'
        });
      }
    }

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return send(res, 400, {
        error: 'تنسيق الطلب غير صالح.',
        code: 'INVALID_BODY'
      });
    }

    // ======================================
    // VALIDATE SUPABASE SESSION
    // ======================================

    stage = 'supabase_auth';

    const authResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: authHeader
        }
      }
    );

    if (!authResponse.ok) {
      const authResult = await readJSON(authResponse);

      console.error(
        'Yovia Supabase authentication failed:',
        authResponse.status,
        authResult.data?.msg ||
        authResult.data?.message ||
        'Authentication rejected'
      );

      return send(res, 401, {
        error: 'جلسة Supabase غير صالحة. حدّث الصفحة وحاول مرة أخرى.',
        code: 'INVALID_SESSION'
      });
    }

    // ======================================
    // NORMALIZE USER MESSAGES
    // ======================================

    stage = 'messages';

    const messages = normalizeMessages(body.messages);

    if (!messages.length) {
      const singleMessage =
        typeof body.message === 'string'
          ? body.message.trim()
          : typeof body.prompt === 'string'
            ? body.prompt.trim()
            : '';

      if (singleMessage) {
        messages.push({
          role: 'user',
          parts: [
            {
              text: singleMessage
            }
          ]
        });
      }
    }

    if (
      !messages.length ||
      !messages.some(message => message.role === 'user')
    ) {
      return send(res, 400, {
        error: 'اكتب رسالة أولًا.',
        code: 'MISSING_MESSAGE'
      });
    }

    // ======================================
    // DAILY MESSAGE QUOTA
    // ======================================

    stage = 'quota';

    const quotaResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/yovia_consume_message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: authHeader
        },
        body: '{}'
      }
    );

    const quotaResult = await readJSON(quotaResponse);

    if (!quotaResponse.ok) {
      console.error(
        'Yovia quota RPC error:',
        quotaResponse.status,
        quotaResult.raw.slice(0, 1500)
      );

      return send(res, 500, {
        error: 'تعذّر التحقق من حد الرسائل.',
        code: 'QUOTA_RPC_ERROR'
      });
    }

    const quotaData = quotaResult.data;

    const quota = Array.isArray(quotaData)
      ? quotaData[0]
      : quotaData;

    if (!quota || typeof quota !== 'object') {
      console.error(
        'Yovia invalid quota response:',
        quotaResult.raw.slice(0, 1000)
      );

      return send(res, 500, {
        error: 'استجابة عداد الرسائل غير مفهومة.',
        code: 'QUOTA_INVALID_RESPONSE'
      });
    }

    const allowed =
      quota.allowed === true ||
      quota.status === 'allowed';

    if (!allowed) {
      const reached =
        quota.code === 'LIMIT_REACHED' ||
        quota.status === 'limit_reached';

      return send(res, reached ? 429 : 403, {
        error: reached
          ? 'وصلت للحد اليومي من الرسائل. يمكنك المحاولة بعد إعادة ضبط الحد أو مراجعة الباقات.'
          : 'تعذّر السماح بالرسالة حسب إعدادات الباقة.',

        code:
          quota.code ||
          (reached ? 'LIMIT_REACHED' : 'QUOTA_DENIED'),

        plan: quota.plan || null,
        limit: quota.limit ?? null,
        remaining: quota.remaining ?? null,
        reset_at: quota.reset_at || null
      });
    }

    // ======================================
    // SYSTEM INSTRUCTION
    // ======================================

    stage = 'system_instruction';

    const suppliedSystem = Array.isArray(body.messages)
      ? body.messages
          .filter(message =>
            message &&
            message.role === 'system' &&
            typeof message.content === 'string'
          )
          .map(message => message.content.trim())
          .filter(Boolean)
          .join('\n\n')
      : '';

    const systemInstruction = [
      SYSTEM_PROMPT,
      suppliedSystem
    ]
      .filter(Boolean)
      .join('\n\n');

    // ======================================
    // GEMINI CONTENTS
    // ======================================

    stage = 'gemini_prepare';

    const geminiContents = messages.map(message => ({
      role: message.role,
      parts: message.parts
    }));

    const maxOutputTokens =
      Number.isFinite(Number(body.max_tokens)) &&
      Number(body.max_tokens) > 0
        ? Math.min(8192, Math.max(1, Math.floor(Number(body.max_tokens))))
        : 2048;

    // ======================================
    // GEMINI REQUEST
    // ======================================

    stage = 'gemini_request';

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstruction
              }
            ]
          },

          contents: geminiContents,

          generationConfig: {
            maxOutputTokens
          }
        })
      }
    );

    // ======================================
    // READ GEMINI RESPONSE
    // ======================================

    stage = 'gemini_response';

    const geminiResult = await readJSON(geminiResponse);

    const geminiData = geminiResult.data;

    if (!geminiResponse.ok) {
      const geminiError =
        geminiData?.error?.message ||
        `Gemini HTTP ${geminiResponse.status}`;

      console.error(
        'Yovia Gemini API error:',
        geminiResponse.status,
        geminiError
      );

      return send(res, 502, {
        error: 'تعذّر على Yovia الحصول على رد من النموذج حاليًا.',
        code: 'GEMINI_REQUEST_FAILED',
        details: geminiError
      });
    }

    if (!geminiData || typeof geminiData !== 'object') {
      console.error(
        'Yovia Gemini invalid response:',
        geminiResult.raw.slice(0, 1500)
      );

      return send(res, 502, {
        error: 'وصل رد غير صالح من خدمة الذكاء الاصطناعي.',
        code: 'GEMINI_INVALID_RESPONSE'
      });
    }

    // ======================================
    // EXTRACT ANSWER
    // ======================================

    stage = 'gemini_extract';

    const candidate = geminiData.candidates?.[0];

    const answer = (
      candidate?.content?.parts || []
    )
      .map(part =>
        typeof part.text === 'string'
          ? part.text
          : ''
      )
      .join('')
      .trim();

    if (!answer) {
      console.error(
        'Yovia empty Gemini response:',
        JSON.stringify({
          promptFeedback: geminiData.promptFeedback,
          finishReason: candidate?.finishReason
        })
      );

      return send(res, 502, {
        error: 'النموذج لم يُرجع نصًا. حاول مرة أخرى.',
        code: 'EMPTY_MODEL_RESPONSE',
        details: candidate?.finishReason || null
      });
    }

    // ======================================
    // SUCCESS RESPONSE
    // OpenAI-compatible format
    // ======================================

    stage = 'success_response';

    return send(res, 200, {
      id: `yovia-${Date.now()}`,

      object: 'chat.completion',

      choices: [
        {
          index: 0,

          message: {
            role: 'assistant',
            content: answer
          },

          finish_reason: candidate?.finishReason || 'STOP'
        }
      ],

      model: GEMINI_MODEL,

      quota: {
        plan: quota.plan || null,
        used: quota.used ?? null,
        limit: quota.limit ?? null,
        remaining: quota.remaining ?? null,
        reset_at: quota.reset_at || null
      }
    });

  } catch (error) {

    // ======================================
    // INTERNAL ERROR
    // ======================================

    console.error('Yovia chat handler error:', {
      stage,
      name: error?.name || 'Error',
      message: error?.message || String(error)
    });

    return send(res, 500, {
      error: 'حصل خطأ داخلي في Yovia AI.',
      code: 'YOVIA_INTERNAL_ERROR',
      stage
    });
  }
};
