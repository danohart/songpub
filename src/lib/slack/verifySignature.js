import crypto from "crypto";

export function verifySlackSignature(req) {
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

  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestamp) > 300) {
    console.log("Timestamp too old");
    return false;
  }

  const rawBody = req.body
    ? typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body)
    : "";

  console.log("Raw body:", rawBody);

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", process.env.SLACK_SIGNING_SECRET)
      .update(sigBasestring, "utf8")
      .digest("hex");

  console.log("Expected signature:", mySignature);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(mySignature),
      Buffer.from(slackSignature)
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
