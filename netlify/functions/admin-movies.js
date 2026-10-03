const { createClient } = require("@supabase/supabase-js");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function getAccessToken(event) {
  const header =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    "";

  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

function cleanMovie(movie) {
  return {
    title: String(movie.title ?? "").trim(),
    year: Number(movie.year),
    genre: String(movie.genre ?? "").trim(),
    language: String(movie.language ?? "").trim(),
    rating: Number(movie.rating),
    director: String(movie.director ?? "").trim(),
    cast_members: String(movie.cast_members ?? "").trim(),
    description: String(movie.description ?? "").trim(),
    poster: String(movie.poster ?? "").trim(),
    backdrop: String(movie.backdrop ?? "").trim(),
    trailer_url: String(movie.trailer_url ?? "").trim() || null,
    video_url: String(movie.video_url ?? "").trim() || null
  };
}

function validateMovie(movie) {
  const required = [
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

  for (const field of required) {
    if (
      movie[field] === undefined ||
      movie[field] === null ||
      String(movie[field]).trim() === ""
    ) {
      return `Missing required field: ${field}`;
    }
  }

  if (!Number.isInteger(movie.year) || movie.year < 1888 || movie.year > 2100) {
    return "Release year must be between 1888 and 2100.";
  }

  if (!Number.isFinite(movie.rating) || movie.rating < 0 || movie.rating > 10) {
    return "Rating must be between 0 and 10.";
  }

  return null;
}

exports.handler = async function (event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return json(204, {});
    }

    if (!["POST", "PATCH", "DELETE"].includes(event.httpMethod)) {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl =
      process.env.SUPABASE_PUBLIC_URL ||
      process.env.SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const adminUserId = process.env.ADMIN_USER_ID;

    if (!supabaseUrl || !supabaseSecretKey || !adminUserId) {
      return json(500, { error: "Server configuration is incomplete." });
    }

    const accessToken = getAccessToken(event);
    if (!accessToken) {
      return json(401, { error: "Authentication required." });
    }

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

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return json(401, { error: "Invalid or expired login session." });
    }

    if (user.id !== adminUserId) {
      return json(403, { error: "You are not authorized to manage movies." });
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON data." });
    }

    // ADD
    if (event.httpMethod === "POST") {
      const movie = cleanMovie(body);
      const validationError = validateMovie(movie);
      if (validationError) return json(400, { error: validationError });

      const { data: lastMovie, error: lastError } = await supabase
        .from("movies")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

      if (lastError) return json(500, { error: lastError.message });

      const nextId =
        lastMovie && lastMovie.length
          ? Number(lastMovie[0].id) + 1
          : 1;

      const { data, error } = await supabase
        .from("movies")
        .insert([{ id: nextId, ...movie }])
        .select()
        .single();

      if (error) return json(500, { error: error.message });

      return json(200, { success: true, movie: data });
    }

    // EDIT
    if (event.httpMethod === "PATCH") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 1) {
        return json(400, { error: "A valid movie ID is required." });
      }

      const movie = cleanMovie(body);
      const validationError = validateMovie(movie);
      if (validationError) return json(400, { error: validationError });

      const { data, error } = await supabase
        .from("movies")
        .update(movie)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return json(404, { error: "Movie not found." });
        }
        return json(500, { error: error.message });
      }

      return json(200, { success: true, movie: data });
    }

    // DELETE
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) {
      return json(400, { error: "A valid movie ID is required." });
    }

    const { data, error } = await supabase
      .from("movies")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return json(404, { error: "Movie not found." });
      }
      return json(500, { error: error.message });
    }

    return json(200, { success: true, deletedId: data.id });

  } catch (error) {
    console.error("Admin movie function error:", error);
    return json(500, { error: "Internal server error." });
  }
};
