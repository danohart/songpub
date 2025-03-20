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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Collect the raw body for signature verification
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  req.rawBody = rawBody;

  // Parse the body for use in our code
  const body = querystring.parse(rawBody);

  console.log("Request body:", body);

  // Verify the request
  // Comment out during development if needed
  /*
  if (!verifySlackRequest(req)) {
    console.log('Verification failed - unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  */

  // Immediately acknowledge the command to meet Slack's 3-second timeout
  res.status(200).json({
    response_type: "ephemeral",
    text: `Converting link: ${body.text}...`,
  });

  // Get the music link from the command text
  const { text, response_url, user_name } = body;

  // Process the request asynchronously
  try {
    console.log(`Processing request from ${user_name} for link: ${text}`);

    // Fetch song data from Songlink API
    const songlinkEndpoint = "https://api.song.link/v1-alpha.1/links";
    const response = await fetch(
      `${songlinkEndpoint}?url=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      throw new Error(`Songlink API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Songlink response received");

    // Format the response for Slack
    const formattedResponse = formatSlackResponse(data, user_name);

    // Send the formatted response back to Slack
    console.log("Sending response to Slack");
    await fetch(response_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedResponse),
    });

    console.log("Response sent successfully");
  } catch (error) {
    console.error("Error processing request:", error);

    // Send error message to Slack
    await fetch(response_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: `Error: Could not convert the link. Please make sure it's a valid music streaming link.`,
      }),
    });
  }
}

function formatSlackResponse(data, userName) {
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

  // Format link text
  const linkText = getPlatformLinks(data.linksByPlatform);

  return {
    response_type: "in_channel",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${entity.title}*\nby ${entity.artistName}`,
        },
        accessory: entity.thumbnailUrl
          ? {
              type: "image",
              image_url: entity.thumbnailUrl,
              alt_text: entity.title,
            }
          : null,
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Shared by <@${userName}>`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Listen on:*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: linkText,
        },
      },
    ],
  };
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
    tidal: "TIDAL",
    amazonMusic: "Amazon Music",
    googleStore: "Google Play",
  };

  return platforms[platformKey] || platformKey;
}
