/**
 * YOVIA AI - Automatic API Error Fixer
 * يصلح إضافة chatId إلى طلب /api/chat تلقائيًا.
 * ينشئ نسخة احتياطية قبل تعديل script.js.
 */

const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "script.js");
const backupPath = path.join(
    __dirname,
    "script.js.before-yovia-api-fix.bak"
);

function stop(message) {
    console.error("\n[YOVIA FIXER] " + message + "\n");
    process.exitCode = 1;
}

if (!fs.existsSync(targetPath)) {
    stop("لم أجد ملف script.js. ضع أداة الإصلاح بجانبه.");
} else {
    let source = fs.readFileSync(targetPath, "utf8");

    const alreadyFixed =
        /chatId\s*:\s*currentChatId/.test(source) &&
        /fetch\(\s*["'`]\/api\/chat["'`]/.test(source);

    if (alreadyFixed) {
        console.log(
            "[YOVIA FIXER] chatId موجود بالفعل. لم يتم تعديل الملف."
        );
    } else {
        const originalPattern =
            /body\s*:\s*JSON\.stringify\(\s*\{\s*message\s*:\s*text\s*,\s*history\s*:\s*conversationHistory\.slice\(0\s*,\s*-1\)\s*\}\s*\)/m;

        const replacement = `body: JSON.stringify({
                        chatId: currentChatId,
                        message: text,
                        history: conversationHistory.slice(0, -1)
                    })`;

        if (!originalPattern.test(source)) {
            stop(
                "لم أتعرف على صيغة طلب API في script.js. " +
                "لم يتم تعديل الملف."
            );
        } else {
            try {
                // إنشاء نسخة احتياطية
                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(targetPath, backupPath);

                    console.log(
                        "[YOVIA FIXER] تم إنشاء النسخة الاحتياطية."
                    );
                }

                // إضافة chatId إلى طلب API
                source = source.replace(
                    originalPattern,
                    replacement
                );

                fs.writeFileSync(
                    targetPath,
                    source,
                    "utf8"
                );

                console.log(
                    "\n[YOVIA FIXER] تم تعديل script.js بنجاح."
                );

                console.log(
                    "[YOVIA FIXER] تمت إضافة chatId إلى طلب /api/chat."
                );

                console.log(
                    "\nتنبيه: إذا استمر الخطأ، فقد يكون السبب في " +
                    "ملف السيرفر أو إعدادات Gemini أو Supabase."
                );

            } catch (error) {
                stop(
                    "تعذر حفظ التعديل: " + error.message
                );
            }
        }
    }
}
