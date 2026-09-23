(async function () {

  const supabaseClient =
    window.novaSupabase;

  if (!supabaseClient) {

    console.error(
      "Nova Supabase client is missing."
    );

    return;

  }

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {

    console.error(
      "Nova Auth Session Error:",
      error
    );

    window.location.href =
      "login.html";

    return;

  }

  if (!data?.session) {

    window.location.href =
      "login.html";

  }

})();
