import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

router.get("/hls-proxy", async (req, res) => {
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    logger.info({ url: decodedUrl.substring(0, 100) }, "HLS proxy request");

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://player.kingx.dev/",
      Origin: "https://player.kingx.dev",
    };

    const response = await fetch(decodedUrl, {
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      logger.error(
        { status: response.status, url: decodedUrl.substring(0, 100) },
        "Upstream error",
      );
      res.status(response.status).json({ error: "Upstream server error" });
      return;
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const isM3U8 =
      decodedUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegurl");

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
    res.setHeader(
      "Content-Type",
      isM3U8 ? "application/vnd.apple.mpegurl" : contentType,
    );

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      res.setHeader(
        "Content-Range",
        response.headers.get("content-range") || "",
      );
      res.setHeader(
        "Accept-Ranges",
        response.headers.get("accept-ranges") || "bytes",
      );
    }

    if (isM3U8) {
      const text = await response.text();
      const baseUrl = new URL(decodedUrl);
      const baseOrigin = baseUrl.origin;
      const basePath = baseUrl.pathname.substring(
        0,
        baseUrl.pathname.lastIndexOf("/") + 1,
      );

      const proxied = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return line;

          let absoluteUrl: string;
          if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            absoluteUrl = trimmed;
          } else if (trimmed.startsWith("/")) {
            absoluteUrl = `${baseOrigin}${trimmed}`;
          } else {
            absoluteUrl = `${baseOrigin}${basePath}${trimmed}`;
          }

          return `/api/hls-proxy?url=${encodeURIComponent(absoluteUrl)}`;
        })
        .join("\n");

      res.send(proxied);
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    }
  } catch (err: any) {
    logger.error({ err: err?.message }, "HLS proxy error");
    res.status(500).json({ error: "Proxy request failed" });
  }
});

router.options("/hls-proxy", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.sendStatus(200);
});

export default router;
