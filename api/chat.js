
'use strict';

// ============================================================
// YOVIA AI - CHAT API
// Supabase Authentication + Daily Quotas
// Groq REAL STREAMING (SSE, OpenAI-compatible)
// ============================================================

// ============================================================
// ENVIRONMENT
// ============================================================

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
أنت Yovia AI، مساعد ذكي متعدد اللغات.

- اسمك Yovia.
- افهم لغة المستخدم ورد باللغة نفسها وبلهجته قدر الإمكان.
- إذا سُئلت عن اسمك فقل: أنا Yovia.
- إذا سُئلت عن مطوّر Yovia فقل: المطوّر هو يوسف.
- إذا سُئلت من مؤسسك أو من صنعك أو من أسسك فقل بالضبط: أنا يوفيا من شركة Yovia AI التي أسسها Youssef Shenuoda.
- لا تقل إنك Nova أو Gemini أو Google أو OpenAI أو Groq.
- حافظ على سياق المحادثة.
- لا تخترع معلومات أو تدّعي تنفيذ شيء لم تنفذه.
- كن واضحًا ومباشرًا.

عند طلب موقع أو صفحة أو تطبيق أو لعبة أو أي واجهة:
- اكتب ملف HTML واحد كامل (HTML وCSS وJavaScript داخله) داخل كتلة كود واحدة، بدون اختصارات أو "باقي الكود هنا".
- كل زرار وقائمة ونموذج لازم يشتغل فعلاً بـ JavaScript حقيقي. لا تكتب زرارًا بلا وظيفة. اربط الأحداث بـ addEventListener بعد تحميل الصفحة.
- راجع الكود في ذهنك قبل الإرسال: كل id مستخدم في JavaScript موجود في HTML، وكل دالة معرّفة، ولا توجد أخطاء.
- لا تستخدم مكتبات خارجية إلا لو ضرورية، ومن CDN موثوق.
- التصميم لازم يكون بمستوى مواقع احترافية حديثة وليس بسيطًا:
  * قسم رئيسي (Hero) كبير بخلفية متدرجة جذابة وعنوان ضخم وزر دعوة واضح.
  * لوحة ألوان من لونين أساسيين ولون مميز، مع تدرجات (linear-gradient) وخلفيات بطابع زجاجي (glassmorphism) عند المناسبة.
  * بطاقات (cards) بزوايا 16 إلى 24 بكسل وظلال ناعمة وحركة رفع عند المرور (hover).
  * لكل منتج أو صنف صورة حقيقية تناسب نوع الموقع الذي طلبه المستخدم (كشري، ملابس، أجهزة، عقارات، أو غيره)، ولا تستخدم الإيموجي بديلًا للصورة إلا عند فشل التحميل فقط: استخدم الرابط https://loremflickr.com/600/400/KEYWORD?lock=N حيث KEYWORD كلمة إنجليزية واحدة تصف المنتج (مثل food أو rice أو shoes) وN رقم مختلف لكل صورة. اضبط الصورة بـ object-fit: cover وزوايا مدورة، وأضف onerror يستبدلها بخلفية متدرجة وإيموجي مناسب حتى لا تظهر صورة مكسورة.
  * نمط تجربة الاستخدام المطلوب في المتاجر والمطاعم: رأس ثابت فيه الشعار وزر السلة بعداد، بطاقات منتجات فيها صورة حقيقية للمنتج نفسه (وليس إيموجي) داخل إطار بزوايا مدورة، وشارات مثل "الأكثر طلبًا"، وزر "أضف +" واضح، وسلة تنزلق من الأسفل (bottom sheet) فيها أزرار + و- وحذف وملخص (المجموع الفرعي والتوصيل والإجمالي)، ونموذج تأكيد فيه تحقق من الحقول المطلوبة ورسالة نجاح بعد الإرسال، ولوحة ألوان دافئة متناسقة.
  * أيقونات وإيموجي معبرة بدل الفراغ، وصور من Unsplash أو أشكال SVG عند الحاجة.
  * خط Cairo أو Tajawal من Google Fonts، مع تدرج واضح بين أحجام العناوين والنص.
  * حركات دخول ناعمة (fade وslide) وانتقالات 0.3 ثانية على كل العناصر التفاعلية.
  * أقسام متعددة: رأس ثابت، تعريف، مميزات، منتجات أو خدمات، آراء عملاء، تذييل.
  * مساحات مريحة، وتباين ألوان جيد، وشكل مناسب للموبايل أولًا.
- متجاوب مع الموبايل (meta viewport وflex/grid)، واجعل الاتجاه RTL عندما يكون المحتوى عربيًا.
- استخدم محتوى واقعيًا بدل نصوص تجريبية.
- بعد الكود اشرح في سطرين كيف يعمل.
`;

// ============================================================
// RESPONSE HELPERS
// ============================================================

function send(res, status, payload) {
  return res.status(status).json(payload);
}

async function readJSON(response) {
  const raw = await response.text();

  if (!raw) {
    return { raw: '', data: null };
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

// ============================================================
// MESSAGE NORMALIZATION
// ============================================================

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
          ? 'assistant'
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
        content
      };
    })
    .filter(Boolean)
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.length > 2500 ? m.content.slice(-2500) : m.content }));
}

// ============================================================
// SSE HELPERS
// ============================================================

function sendSSE(res, payload) {
  if (res.destroyed || res.writableEnded) {
    return false;
  }

  return res.write(
    `data: ${JSON.stringify(payload)}\n\n`
  );
}

// ============================================================
// MAIN HANDLER
// ============================================================

module.exports = async function handler(req, res) {

  let stage = 'initialization';
  let groqReader = null;

  // ==========================================================
  // CORS
  // ==========================================================

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

  try {

    // ========================================================
    // ENVIRONMENT CHECK
    // ========================================================

    stage = 'environment';

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return send(res, 500, {
        error: 'إعدادات Supabase ناقصة على الخادم.',
        code: 'SUPABASE_CONFIG_ERROR'
      });
    }

    if (!GROQ_API_KEY) {
      return send(res, 500, {
        error: 'مفتاح Groq غير مضبوط على الخادم.',
        code: 'MISSING_GROQ_API_KEY'
      });
    }

    // ========================================================
    // AUTHENTICATION HEADER
    // ========================================================

    stage = 'authentication_header';

    const authHeader = req.headers.authorization || '';

    // الزائر (بدون تسجيل دخول) يقدر يستخدم الشات بدون توكن
    const isGuest = !/^Bearer\s+\S+/i.test(authHeader);

    // ========================================================
    // REQUEST BODY
    // ========================================================

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

    // ========================================================
    // SUPABASE AUTHENTICATION
    // ========================================================

    stage = 'supabase_auth';

    let isUnlimited = false;
    const UNLIMITED_EMAILS = ['novaaicompany3@gmail.com', 'shenuodayoussef2@gmail.com', 'mariamshenuoda27@gmail.com'];

    if (!isGuest) {

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

    {
      const me = await readJSON(authResponse);
      const em = String((me.data && me.data.email) || '').toLowerCase();
      isUnlimited = UNLIMITED_EMAILS.includes(em);
    }

    }

    // ========================================================
    // NORMALIZE MESSAGES
    // ========================================================

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
          content: singleMessage
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

    // ========================================================
    // DAILY MESSAGE QUOTA
    // ========================================================

    stage = 'quota';

    let quota = null;

    if (!isGuest && !isUnlimited) {

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

    }

    // ========================================================
    // SYSTEM INSTRUCTION
    // ========================================================

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

    // ========================================================
    // GROQ MESSAGES
    // ========================================================

    stage = 'groq_prepare';

    const groqMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.map(message => ({
        role: message.role,
        content: message.content
      }))
    ];

    const requestedTokens = Number(body.max_tokens);

    const maxOutputTokens =
      Number.isFinite(requestedTokens) &&
      requestedTokens > 0
        ? Math.min(
            3500,
            Math.max(1, Math.floor(requestedTokens))
          )
        : 2000;

    const requestedTemperature = Number(body.temperature);

    const temperature =
      Number.isFinite(requestedTemperature)
        ? Math.min(2, Math.max(0, requestedTemperature))
        : 0.7;

    // ========================================================
    // GROQ STREAMING REQUEST
    // ========================================================

    stage = 'groq_request';

    const groqPayload = {
      model: GROQ_MODEL,
      messages: groqMessages,
      stream: true,
      max_completion_tokens: maxOutputTokens,
      temperature
    };

    if (/gpt-oss/i.test(GROQ_MODEL)) {
      groqPayload.reasoning_effort = 'low';
    }

    const groqResponse = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(groqPayload)
    });

    // ========================================================
    // GROQ ERROR
    // ========================================================

    if (!groqResponse.ok) {
      const groqResult = await readJSON(groqResponse);

      const details =
        groqResult.data?.error?.message ||
        groqResult.raw.slice(0, 1500) ||
        `Groq HTTP ${groqResponse.status}`;

      console.error(
        'Yovia Groq API error:',
        groqResponse.status,
        details
      );

      return send(res, 502, {
        error: 'تعذّر على Yovia الحصول على رد من النموذج حاليًا.',
        code: 'GROQ_REQUEST_FAILED',
        details
      });
    }

    if (!groqResponse.body) {
      return send(res, 502, {
        error: 'خدمة النموذج لم تُرجع تدفق بيانات.',
        code: 'GROQ_STREAM_UNAVAILABLE'
      });
    }

    // ========================================================
    // START STREAM RESPONSE
    // ========================================================

    stage = 'groq_stream';

    res.statusCode = 200;

    res.setHeader(
      'Content-Type',
      'text/event-stream; charset=utf-8'
    );

    res.setHeader(
      'Cache-Control',
      'no-cache, no-transform'
    );

    res.setHeader('Connection', 'keep-alive');

    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders?.();

    // ========================================================
    // READ GROQ SSE STREAM
    // ========================================================

    groqReader = groqResponse.body.getReader();

    const decoder = new TextDecoder();

    let buffer = '';
    let totalText = '';
    let streamError = null;

    function processEvent(eventBlock) {
      const lines = eventBlock.split(/\r?\n/);

      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue;
        }

        const raw = line.slice(5).trim();

        if (!raw || raw === '[DONE]') {
          continue;
        }

        let chunk;

        try {
          chunk = JSON.parse(raw);
        } catch {
          continue;
        }

        if (chunk.error) {
          streamError =
            chunk.error.message ||
            'حدث خطأ أثناء توليد الرد.';

          continue;
        }

        const piece = chunk.choices?.[0]?.delta?.content;

        if (typeof piece === 'string' && piece) {
          totalText += piece;

          sendSSE(res, {
            type: 'delta',
            text: piece
          });
        }
      }
    }

    // ========================================================
    // STREAM LOOP
    // ========================================================

    while (true) {
      if (res.destroyed || res.writableEnded) {
        await groqReader.cancel().catch(() => {});
        return;
      }

      const { value, done } = await groqReader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true
      });

      const events = buffer.split(/\r?\n\r?\n/);

      buffer = events.pop() || '';

      for (const eventBlock of events) {
        processEvent(eventBlock);
      }
    }

    // Process remaining buffered data
    buffer += decoder.decode();

    if (buffer.trim()) {
      processEvent(buffer);
    }

    // ========================================================
    // STREAM RESULT
    // ========================================================

    if (streamError) {
      sendSSE(res, {
        type: 'error',
        error: streamError
      });

      return res.end();
    }

    if (!totalText.trim()) {
      sendSSE(res, {
        type: 'error',
        error: 'النموذج لم يُرجع نصًا. حاول مرة أخرى.',
        code: 'EMPTY_MODEL_RESPONSE'
      });

      return res.end();
    }

    // ========================================================
    // DONE EVENT
    // ========================================================

    sendSSE(res, {
      type: 'done',

      model: GROQ_MODEL,

      quota: quota
        ? {
            plan: quota.plan || null,
            used: quota.used ?? null,
            limit: quota.limit ?? null,
            remaining: quota.remaining ?? null,
            reset_at: quota.reset_at || null
          }
        : null
    });

    return res.end();

  } catch (error) {

    // ========================================================
    // ERROR HANDLING
    // ========================================================

    console.error('Yovia chat handler error:', {
      stage,
      name: error?.name || 'Error',
      message: error?.message || String(error)
    });

    if (groqReader) {
      try {
        await groqReader.cancel();
      } catch {}
    }

    if (res.headersSent) {
      sendSSE(res, {
        type: 'error',
        error: 'حصل خطأ أثناء توليد الرد.',
        code: 'YOVIA_STREAM_ERROR'
      });

      if (!res.writableEnded) {
        res.end();
      }

      return;
    }

    return send(res, 500, {
      error: 'حصل خطأ داخلي في Yovia AI.',
      code: 'YOVIA_INTERNAL_ERROR',
      stage
    });
  }
};
