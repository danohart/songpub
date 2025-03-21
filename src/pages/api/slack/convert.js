// pages/api/slack/convert.js
import querystring from "querystring";
import crypto from "crypto";

// Tell Next.js to not parse the body automatically
export const config = {
  api: {
    bodyParser: false,
  },
};

// Verify that the request is coming from Slack
function verifySlackRequest(req) {
  try {
    const slackSignature = req.headers["x-slack-signature"];
    const timestamp = req.headers["x-slack-request-timestamp"];

    // Debug logging
    console.log("Headers:", JSON.stringify(req.headers));
    console.log("Signature:", slackSignature);
    console.log("Timestamp:", timestamp);

    if (!slackSignature || !timestamp) {
      console.log("Missing signature or timestamp");
      return false;
    }

    // Check if the timestamp is recent (within 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
      console.log("Timestamp too old");
      return false;
    }

    // Create the signature base string
    const sigBasestring = `v0:${timestamp}:${req.rawBody}`;

    // Create our own signature
    const mySignature =
      "v0=" +
      crypto
        .createHmac("sha256", process.env.SLACK_SIGNING_SECRET)
        .update(sigBasestring, "utf8")
        .digest("hex");

    console.log("Expected signature:", mySignature);

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(mySignature),
      Buffer.from(slackSignature)
    );
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
}

export default async function handler(req, res) {
  console.log("==== Request received ====");
  console.log("Method:", req.method);
  console.log("Headers:", JSON.stringify(req.headers));

  if (req.method !== "POST") {
    console.log("Invalid method, rejecting");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Collect the raw body for signature verification
  const chunks = [];
  try {
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf8");
    req.rawBody = rawBody;

    console.log("Raw body received, length:", rawBody.length);

    // Parse the body for use in our code
    const body = querystring.parse(rawBody);
    console.log("Request body:", body);

    // Verify the request (commented out for testing)
    /*
    if (!verifySlackRequest(req)) {
      console.log('Verification failed - unauthorized request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    */

    // Immediately acknowledge the command to meet Slack's 3-second timeout
    console.log("Sending immediate acknowledgment");
    res.status(200).json({
      response_type: "ephemeral",
      text: `Converting link: ${body.text}...`,
    });

    // Get the music link from the command text
    const { text, response_url, user_name } = body;

    console.log("Processing request with URL:", text);
    console.log("Response URL:", response_url);
    console.log("User:", user_name);

    // Process the request asynchronously
    try {
      // Log before Songlink API call
      console.log("Calling Songlink API...");

      const songlinkEndpoint = "https://api.song.link/v1-alpha.1/links";
      const apiUrl = `${songlinkEndpoint}?url=${encodeURIComponent(text)}`;
      console.log("Full API URL:", apiUrl);

      const response = await fetch(apiUrl);

      console.log("Songlink API status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Songlink API error text:", errorText);
        throw new Error(
          `Songlink API error: ${response.status} - ${response.statusText}`
        );
      }

      // Log successful response
      console.log("Songlink API call successful");

      const data = await response.json();
      console.log("Songlink data received, keys:", Object.keys(data));

      if (
        !data.entitiesByUniqueId ||
        Object.keys(data.entitiesByUniqueId).length === 0
      ) {
        console.log("No entities found in Songlink response");
        console.log(
          "Full response:",
          JSON.stringify(data).substring(0, 500) + "..."
        );
        throw new Error("No music entities found in the response");
      }

      // Log before sending response to Slack
      console.log("Preparing to send response to Slack");

      // Format and send response
      const formattedResponse = formatSlackResponse(data, user_name);
      console.log(
        "Response formatted, preview:",
        JSON.stringify(formattedResponse).substring(0, 500) + "..."
      );

      console.log("Sending response to URL:", response_url);
      const slackResponse = await fetch(response_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formattedResponse),
      });

      console.log("Slack response status:", slackResponse.status);

      try {
        const responseText = await slackResponse.text();
        console.log("Slack response body:", responseText);
      } catch (textError) {
        console.log("Could not get response text:", textError.message);
      }

      if (slackResponse.ok) {
        console.log("Response successfully sent to Slack");
      } else {
        console.error("Error response from Slack");
      }

      console.log("==== Request processing completed ====");
    } catch (error) {
      console.error("Process error:", error);
      console.error("Error stack:", error.stack);

      // Try to notify Slack about the error
      try {
        console.log("Sending error notification to Slack");
        const errorResponse = await fetch(response_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            response_type: "ephemeral",
            text: `Error processing your request: ${error.message}`,
          }),
        });

        console.log("Error notification status:", errorResponse.status);
        console.log("Error notification sent");
      } catch (notifyError) {
        console.error("Failed to notify Slack about error:", notifyError);
      }
    }
  } catch (mainError) {
    console.error("Fatal error in handler:", mainError);
    // If we haven't sent a response yet
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

function formatSlackResponse(data, userName) {
  try {
    // Get the first entity
    const entityKeys = Object.keys(data.entitiesByUniqueId);
    if (entityKeys.length === 0) {
      return {
        response_type: "ephemeral",
        text: "No music data found for this link.",
      };
    }

    const entityKey = entityKeys[0];
    const entity = data.entitiesByUniqueId[entityKey];

    console.log("Entity found:", {
      title: entity.title,
      artist: entity.artistName,
      thumbnail: entity.thumbnailUrl ? "Yes" : "No",
    });

    // For initial testing, send a simple text-only response
    return {
      response_type: "in_channel",
      text: `*${entity.title}* by ${
        entity.artistName
      }\n\nLinks: ${getPlatformLinksText(data.linksByPlatform)}`,
    };

    // Once the simple format works, try the more complex format:
    /*
    return {
      response_type: 'in_channel',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${entity.title}*\nby ${entity.artistName}`
          },
          accessory: entity.thumbnailUrl ? {
            type: 'image',
            image_url: entity.thumbnailUrl,
            alt_text: entity.title
          } : null
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Shared by <@${userName}>`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Listen on:*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: getPlatformLinks(data.linksByPlatform)
          }
        }
      ]
    };
    */
  } catch (formatError) {
    console.error("Error formatting response:", formatError);
    return {
      response_type: "ephemeral",
      text: "Error formatting music data. Please try again.",
    };
  }
}

function getPlatformLinksText(linksByPlatform) {
  if (!linksByPlatform || Object.keys(linksByPlatform).length === 0) {
    return "No platforms available";
  }

  const links = [];
  Object.entries(linksByPlatform).forEach(([platform, link]) => {
    const platformName = getPlatformName(platform);
    links.push(`${platformName}: ${link.url}`);
  });

  return links.join(" | ");
}

function getPlatformLinks(linksByPlatform) {
  if (!linksByPlatform || Object.keys(linksByPlatform).length === 0) {
    return "No platforms available";
  }

  return Object.entries(linksByPlatform)
    .map(([platform, link]) => {
      const platformName = getPlatformName(platform);
      return `• <${link.url}|${platformName}>`;
    })
    .join("\n");
}

function getPlatformName(platformKey) {
  const platforms = {
    spotify: "Spotify",
    appleMusic: "Apple Music",
    youtube: "YouTube",
    youtubeMusic: "YouTube Music",
    deezer: "Deezer",
    tidal: "TIDAL",
    googleStore: "Google Play",
  };

  return platforms[platformKey] || platformKey;
}
