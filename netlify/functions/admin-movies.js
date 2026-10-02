const { createClient } = require("@supabase/supabase-js");

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: "Method not allowed"
        })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Supabase environment variables are not configured."
        })
      };
    }

    const movie = JSON.parse(event.body || "{}");

    if (
      !movie.title ||
      !movie.year ||
      !movie.genre ||
      !movie.language ||
      !movie.rating ||
      !movie.director ||
      !movie.cast_members ||
      !movie.description ||
      !movie.poster ||
      !movie.backdrop
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Please fill in all movie fields."
        })
      };
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    // Get the next movie ID
    const { data: lastMovie, error: lastError } = await supabase
      .from("movies")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (lastError) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: lastError.message
        })
      };
    }

    const nextId =
      lastMovie && lastMovie.length > 0
        ? lastMovie[0].id + 1
        : 1;

    const { data, error } = await supabase
      .from("movies")
      .insert([
        {
          id: nextId,
          title: movie.title,
          year: Number(movie.year),
          genre: movie.genre,
          language: movie.language,
          rating: Number(movie.rating),
          director: movie.director,
          cast_members: movie.cast_members,
          description: movie.description,
          poster: movie.poster,
          backdrop: movie.backdrop
        }
      ])
      .select()
      .single();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: error.message
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
