exports.handler = async function () {
  try {
    const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Supabase environment variables are missing"
        })
      };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/movies?select=*`,
      {
        method: "GET",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Supabase REST API error",
          status: response.status,
          response: text
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: text
    };

  } catch (error) {
    console.error("REST connection error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: error.message,
        cause: error?.cause?.message || null,
        code: error?.cause?.code || null
      })
    };
  }
};
