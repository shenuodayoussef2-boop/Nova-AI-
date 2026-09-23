const supabaseClient =
  window.novaSupabase;

const authForm =
  document.getElementById("authForm");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const nameInput =
  document.getElementById("name");

const nameField =
  document.getElementById("nameField");

const submitBtn =
  document.getElementById("submitBtn");

const switchBtn =
  document.getElementById("switchBtn");

const switchText =
  document.getElementById("switchText");

const formTitle =
  document.getElementById("formTitle");

const formSubtitle =
  document.getElementById("formSubtitle");

const messageBox =
  document.getElementById("message");

let isSignup = false;


// ==========================================
// MESSAGE
// ==========================================

function showMessage(
  text,
  type = "error"
) {

  messageBox.textContent = text;

  messageBox.className =
    `message show ${type}`;

}


// ==========================================
// CLEAR MESSAGE
// ==========================================

function clearMessage() {

  messageBox.textContent = "";

  messageBox.className =
    "message";

}


// ==========================================
// SWITCH LOGIN / SIGNUP
// ==========================================

switchBtn.addEventListener(
  "click",
  () => {

    isSignup =
      !isSignup;

    clearMessage();

    if (isSignup) {

      formTitle.textContent =
        "اعمل حساب جديد 🚀";

      formSubtitle.textContent =
        "سجّل حسابك وابدأ تستخدم Nova AI";

      submitBtn.textContent =
        "إنشاء الحساب";

      switchText.textContent =
        "عندك حساب بالفعل؟";

      switchBtn.textContent =
        "تسجيل الدخول";

      nameField.style.display =
        "block";

      nameInput.required =
        true;

      passwordInput.autocomplete =
        "new-password";

    }

    else {

      formTitle.textContent =
        "أهلاً بيك في Nova AI 👋";

      formSubtitle.textContent =
        "سجّل دخولك وكمل مع Nova";

      submitBtn.textContent =
        "تسجيل الدخول";

      switchText.textContent =
        "معندكش حساب؟";

      switchBtn.textContent =
        "إنشاء حساب";

      nameField.style.display =
        "none";

      nameInput.required =
        false;

      passwordInput.autocomplete =
        "current-password";

    }

  }
);


// ==========================================
// SUBMIT
// ==========================================

authForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearMessage();

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    const name =
      nameInput.value.trim();

    if (!email || !password) {

      showMessage(
        "اكتب الإيميل والباسورد الأول."
      );

      return;
    }


    if (
      isSignup &&
      !name
    ) {

      showMessage(
        "اكتب اسمك الأول."
      );

      return;
    }


    submitBtn.disabled =
      true;

    submitBtn.textContent =
      isSignup
        ? "جاري إنشاء الحساب..."
        : "جاري تسجيل الدخول...";


    try {

      // ====================================
      // SIGN UP
      // ====================================

      if (isSignup) {

        const {
          data,
          error
        } =
          await supabaseClient.auth.signUp({
            email,
            password,

            options: {
              data: {
                name
              }
            }
          });


        if (error) {
          throw error;
        }


        // في حالة الـ email confirmation
        if (
          data?.user &&
          !data?.session
        ) {

          showMessage(
            "الحساب اتعمل ✅ راجع إيميلك واضغط على رابط التأكيد، وبعدها ارجع سجّل دخول.",
            "success"
          );

          return;
        }


        showMessage(
          "الحساب اتعمل بنجاح 🎉",
          "success"
        );


        setTimeout(
          () => {
            window.location.href =
              "index.html";
          },
          800
        );

        return;
      }


      // ====================================
      // LOGIN
      // ====================================

      const {
        data,
        error
      } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });


      if (error) {
        throw error;
      }


      if (!data?.session) {

        throw new Error(
          "تم الدخول لكن الجلسة مش موجودة."
        );

      }


      showMessage(
        "تم تسجيل الدخول ✅",
        "success"
      );


      setTimeout(
        () => {

          window.location.href =
            "index.html";

        },
        500
      );

    }

    catch (error) {

      console.error(
        "NOVA AUTH ERROR:",
        error
      );

      showMessage(
        getArabicAuthError(
          error
        )
      );

    }

    finally {

      submitBtn.disabled =
        false;

      submitBtn.textContent =
        isSignup
          ? "إنشاء الحساب"
          : "تسجيل الدخول";

    }

  }
);


// ==========================================
// ARABIC ERROR MESSAGES
// ==========================================

function getArabicAuthError(
  error
) {

  const msg =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  if (
    msg.includes(
      "invalid login credentials"
    )
  ) {

    return (
      "الإيميل أو الباسورد غلط."
    );

  }


  if (
    msg.includes(
      "email not confirmed"
    )
  ) {

    return (
      "أكد إيميلك الأول من الرسالة اللي اتبعتتلك."
    );

  }


  if (
    msg.includes(
      "password"
    ) &&
    msg.includes(
      "at least"
    )
  ) {

    return (
      "الباسورد لازم يكون 6 حروف أو أكتر."
    );

  }


  if (
    msg.includes(
      "rate limit"
    )
  ) {

    return (
      "استنى شوية وجرب تاني."
    );

  }


  return (
    error?.message ||
    "حصلت مشكلة، جرّب تاني."
  );

}
