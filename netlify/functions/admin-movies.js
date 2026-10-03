const { createClient } = require("@supabase/supabase-js");

exports.handler = async function (event) {
  try {
    // Only POST requests are allowed
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method not allowed" })
      };
    }

    // Server-side environment variables
    const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const adminUserId = process.env.ADMIN_USER_ID;

    if (!supabaseUrl || !supabaseSecretKey || !adminUserId) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Server configuration is incomplete."
        })
      };
    }

    // Get login token from browser
    const authHeader =
      event.headers?.authorization ||
      event.headers?.Authorization ||
      "";

    if (!authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Authentication required."
        })
      };
    }

    const accessToken = authHeader.substring(7).trim();

    if (!accessToken) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid authentication token."
        })
      };
    }

    // Server-side Supabase client
    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the user's access token
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid or expired login session."
        })
      };
    }

    // Check whether this user is the configured admin
    if (user.id !== adminUserId) {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "You are not authorized to add movies."
        })
      };
    }

    // Read movie data
    let movie;

    try {
      movie = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid movie data."
        })
      };
    }

    // Validate required fields
    const requiredFields = [
      "title",
      "year",
      "genre",
      "language",
      "rating",
      "director",
      "cast_members",
      "description",
      "poster",
      "backdrop"
    ];

    for (const field of requiredFields) {
      if (
        movie[field] === undefined ||
        movie[field] === null ||
        String(movie[field]).trim() === ""
      ) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: `Missing required field: ${field}`
          })
        };
      }
    }

    // Get next movie ID
    const {
      data: lastMovie,
      error: lastError
    } = await supabase
      .from("movies")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (lastError) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: lastError.message
        })
      };
    }

    const nextId =
      lastMovie && lastMovie.length > 0
        ? Number(lastMovie[0].id) + 1
        : 1;

    // Insert movie
    const {
      data,
      error
    } = await supabase
      .from("movies")
      .insert([
        {
          id: nextId,
          title: String(movie.title).trim(),
          year: Number(movie.year),
          genre: String(movie.genre).trim(),
          language: String(movie.language).trim(),
          rating: Number(movie.rating),
          director: String(movie.director).trim(),
          cast_members: String(movie.cast_members).trim(),
          description: String(movie.description).trim(),
          poster: String(movie.poster).trim(),
          backdrop: String(movie.backdrop).trim()
        }
      ])
      .select()
      .single();

    if (error) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.message
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        movie: data
      })
    };

  } catch (error) {
    console.error("Admin movie function error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Internal server error."
      })
    };
  }
};
