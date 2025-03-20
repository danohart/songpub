import { verifySlackSignature } from "../../../lib/slack/verifySignature";

export const config = {
  api: {
    bodyParser: {
      raw: {
        type: "application/x-www-form-urlencoded",
      },
    },
  },
};

export default async function handler(req, res) {
  if (!verifySlackSignature(req)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { text, response_url } = req.body;

  res.status(200).json({
    response_type: "in_channel",
    text: `Converting link: ${text}...`,
  });

  try {
    const songlinkEndpoint = "https://api.song.link/v1-alpha.1/links";
    const response = await fetch(
      `${songlinkEndpoint}?url=${encodeURIComponent(text)}`
    );

    if (!response.ok) throw new Error("Failed to convert link");

    const data = await response.json();

    const formattedResponse = formatSlackResponse(data);

    await fetch(response_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedResponse),
    });
  } catch (error) {
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

function formatSlackResponse(data) {
  const entityKey = Object.keys(data.entitiesByUniqueId)[0];
  const entity = data.entitiesByUniqueId[entityKey];

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
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Listen on:*",
        },
      },
      {
        type: "actions",
        elements: Object.entries(data.linksByPlatform).map(
          ([platform, link]) => ({
            type: "button",
            text: {
              type: "plain_text",
              text: getPlatformName(platform),
            },
            url: link.url,
            style: "primary",
          })
        ),
      },
    ],
  };
}

function getPlatformName(platformKey) {
  const platforms = {
    spotify: "Spotify",
    appleMusic: "Apple Music",
    youtube: "YouTube",
    youtubeMusic: "YouTube Music",
  };
  return platforms[platformKey] || platformKey;
}
