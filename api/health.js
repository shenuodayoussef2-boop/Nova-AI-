
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "Missing Authorization"
    });
  }

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      return res.status(401).json({
        ok: false,
        error: "Invalid Supabase session"
      });
    }

    return res.status(200).json({
      ok: true,
      service: "Yovia API"
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
};
