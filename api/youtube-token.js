const TOKEN_URL = "https://oauth2.googleapis.com/token";

function readClientConfig() {
  return {
    clientId:
      process.env.YOUTUBE_CLIENT_ID || process.env.VITE_YOUTUBE_CLIENT_ID || "",
    clientSecret:
      process.env.YOUTUBE_CLIENT_SECRET ||
      process.env.VITE_YOUTUBE_CLIENT_SECRET ||
      "",
  };
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
  });
}

export async function exchangeYoutubeToken(body) {
  const { clientId, clientSecret } = readClientConfig();
  if (!clientId || !clientSecret) {
    return {
      status: 500,
      json: { error: "YouTube OAuth is not configured on the server." },
    };
  }

  const grantType = body?.grant_type;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
  });

  if (grantType === "authorization_code") {
    if (!body.code || !body.code_verifier || !body.redirect_uri) {
      return { status: 400, json: { error: "Missing authorization fields." } };
    }
    params.set("grant_type", "authorization_code");
    params.set("code", String(body.code));
    params.set("code_verifier", String(body.code_verifier));
    params.set("redirect_uri", String(body.redirect_uri));
  } else if (grantType === "refresh_token") {
    if (!body.refresh_token) {
      return { status: 400, json: { error: "Missing refresh token." } };
    }
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", String(body.refresh_token));
  } else {
    return { status: 400, json: { error: "Unsupported grant type." } };
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { error: "YouTube token endpoint returned an unexpected response." };
  }

  return { status: response.status, json };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await exchangeYoutubeToken(body);
    sendJson(res, result.status, result.json);
  } catch {
    sendJson(res, 500, { error: "YouTube token request failed." });
  }
}
