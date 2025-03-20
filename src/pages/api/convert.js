export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    const songlinkEndpoint = "https://api.song.link/v1-alpha.1/links";
    const queryParams = new URLSearchParams({
      url: url,
      userCountry: "US",
    });

    const response = await fetch(`${songlinkEndpoint}?${queryParams}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Songlink API error:", errorText);
      return res.status(response.status).json({
        error: "Failed to fetch from Songlink API",
        details: errorText,
      });
    }

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error("API route error:", error);
    return res.status(500).json({
      error: "An error occurred while processing your request",
      details: error.message,
    });
  }
}
