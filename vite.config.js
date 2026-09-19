import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { exchangeYoutubeToken } from "./api/youtube-token.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function youtubeTokenDevPlugin() {
  return {
    name: "youtube-token-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/youtube-token", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("error", () => {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "YouTube token request failed." }));
        });
        req.on("end", async () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            const body = raw ? JSON.parse(raw) : {};
            const result = await exchangeYoutubeToken(body);
            res.statusCode = result.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result.json));
          } catch {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "YouTube token request failed." }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.YOUTUBE_CLIENT_SECRET && !process.env.YOUTUBE_CLIENT_SECRET) {
    process.env.YOUTUBE_CLIENT_SECRET = env.YOUTUBE_CLIENT_SECRET;
  }
  if (env.VITE_YOUTUBE_CLIENT_SECRET && !process.env.YOUTUBE_CLIENT_SECRET) {
    process.env.YOUTUBE_CLIENT_SECRET = env.VITE_YOUTUBE_CLIENT_SECRET;
  }
  if (env.VITE_YOUTUBE_CLIENT_ID && !process.env.VITE_YOUTUBE_CLIENT_ID) {
    process.env.VITE_YOUTUBE_CLIENT_ID = env.VITE_YOUTUBE_CLIENT_ID;
  }
  if (env.YOUTUBE_CLIENT_ID && !process.env.YOUTUBE_CLIENT_ID) {
    process.env.YOUTUBE_CLIENT_ID = env.YOUTUBE_CLIENT_ID;
  }

  return {
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", {}]],
        },
      }),
      tailwindcss(),
      youtubeTokenDevPlugin(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
    },
    test: {
      environment: "node",
      include: ["src/__tests__/**/*.test.ts"],
    },
  };
});
