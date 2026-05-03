import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { logger } from "../lib/logger";

const router = Router();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/['"]/g, "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/['"]/g, "").trim();
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Admin API not configured: ADMIN_API_SECRET is not set." });
    return;
  }
  const provided = req.headers["x-admin-secret"] as string | undefined;
  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const HLS_PROXY_ALLOWED_HOSTS = new Set([
  "workers.dev",
  "tera-api30.workers.dev",
  "iteraplay.tera-api30.workers.dev",
  "player.kingx.dev",
  "teradl.kingx.dev",
  "teraboxdownloader.pro",
  "www.teraboxdownloader.pro",
  "googlevideo.com",
  "storage.googleapis.com",
  "cdn.discordapp.com",
]);

function isAllowedProxyHost(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    for (const allowed of HLS_PROXY_ALLOWED_HOSTS) {
      if (hostname === allowed || hostname.endsWith("." + allowed)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

router.get("/terabox-pro", async (req, res) => {
  const { url, quality } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });

  const apiKey = process.env.TERABOX_PRO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "TERABOX_PRO_API_KEY not configured." });
  }
  const preferredQuality = (quality as string) || "1080p";

  try {
    const response = await axios.get(`https://xapiverse.com/api/terabox-pro?url=${encodeURIComponent(url as string)}`, {
      headers: { "Content-Type": "application/json", "xAPIverse-Key": apiKey },
      timeout: 30000,
    });

    const data = response.data;

    if (data.list && Array.isArray(data.list)) {
      const qualityOrder = ["1080p", "720p", "480p", "360p"];
      data.list = data.list.map((item: any) => {
        if (item.fast_stream_url) {
          const startIdx = qualityOrder.indexOf(preferredQuality);
          const ordered = startIdx >= 0 ? [...qualityOrder.slice(startIdx), ...qualityOrder.slice(0, startIdx)] : qualityOrder;
          for (const q of ordered) {
            if (item.fast_stream_url[q]) { item.recommended_url = item.fast_stream_url[q]; item.recommended_quality = q; break; }
          }
        }
        return item;
      });
    } else if (data.fast_stream_url) {
      const qualityOrder = ["1080p", "720p", "480p", "360p"];
      const startIdx = qualityOrder.indexOf(preferredQuality);
      const ordered = startIdx >= 0 ? [...qualityOrder.slice(startIdx), ...qualityOrder.slice(0, startIdx)] : qualityOrder;
      for (const q of ordered) {
        if (data.fast_stream_url[q]) { data.recommended_url = data.fast_stream_url[q]; data.recommended_quality = q; break; }
      }
    }

    return res.json(data);
  } catch (error: any) {
    logger.error({ err: error }, "Terabox backend error");
    return res.status(500).json({ error: "Failed to fetch from Terabox API", details: error.message });
  }
});

router.get("/admin/users", requireAdminSecret, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase service key not configured" });
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });
    const { data: settings } = await supabaseAdmin.from("app_settings").select("*");
    return res.json({ users, settings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/referrals", async (req, res) => {
  const { userId } = req.query;
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase service key not configured" });
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });

    const userList = users as any[];
    const referredUsers = userList.filter((u) => u.user_metadata?.referred_by === userId);
    const count = referredUsers.length;
    const credits = count * 3;
    const freeMonths = Math.floor(count / 5);

    const { data: pendingReq } = await supabaseAdmin
      .from("referral_requests")
      .select("*")
      .eq("user_id", userId as string)
      .eq("status", "pending");

    return res.json({ count, credits, freeMonths, pending: pendingReq?.length ? pendingReq[0] : null });
  } catch (error: any) {
    if (error.code === "42P01") {
      return res.json({ count: 0, credits: 0, freeMonths: 0, pending: null, error: "Table referral_requests missing" });
    }
    return res.status(500).json({ error: error.message });
  }
});

router.post("/referrals/redeem", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase service key not configured" });
  const { userId, count, credits, freeMonths } = req.body;
  try {
    const { data: { user }, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (uErr) throw uErr;

    const { error } = await supabaseAdmin.from("referral_requests").insert({
      user_id: userId,
      email: user.email,
      whatsapp: user.user_metadata?.whatsapp || "",
      referral_count: count,
      credits,
      free_months: freeMonths,
      status: "pending",
    });
    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/admin/referrals/requests", requireAdminSecret, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase service key not configured" });
  try {
    const { data, error } = await supabaseAdmin.from("referral_requests").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ requests: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/admin/referrals/approve", requireAdminSecret, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase service key not configured" });
  const { requestId, status } = req.body;
  try {
    const { error } = await supabaseAdmin.from("referral_requests").update({ status }).eq("id", requestId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/admin/updatesettings", requireAdminSecret, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase service key not configured" });
  const { userId, plan, status, expiresAt } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : null;
    const { error: upsertErr } = await supabaseAdmin.from("app_settings").upsert({
      user_id: userId,
      subscription_plan: plan,
      subscription_status: status,
      subscription_expires_at: expiresAtIso,
      theme: "dark",
      language: "pt-BR",
      autoplay_next: true,
      show_logos: true,
    }, { onConflict: "user_id" });

    if (upsertErr) throw upsertErr;
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/payments/create-preference", async (req, res) => {
  const { title, price, planId, userId, email } = req.body;
  const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "").replace(/['"]/g, "").trim();
  if (!mpToken) return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado." });

  try {
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);
    const APP_URL = process.env.APP_URL || `https://${req.get("host")}`;

    const response = await preference.create({
      body: {
        items: [{ id: planId || "hub", title: title || "Assinatura", quantity: 1, unit_price: Number(price) || 15.9, currency_id: "BRL" }],
        payer: { email: email || "test@test.com" },
        back_urls: {
          success: `${APP_URL}/menu?payment=success&plan=${planId}`,
          failure: `${APP_URL}/menu?payment=failure`,
          pending: `${APP_URL}/menu?payment=pending`,
        },
        auto_return: "approved",
        external_reference: `${userId}_${planId}_${Date.now()}`,
        notification_url: `${APP_URL}/api/payments/webhook`,
      },
    });

    res.json({ id: response.id, init_point: response.init_point });
  } catch (error: any) {
    logger.error({ err: error }, "Erro ao criar preferência do Mercado Pago");
    res.status(500).json({ error: error.message || "Erro ao conectar com Mercado Pago." });
  }
});

router.post("/payments/create-payment", async (req, res) => {
  const { title, price, planId, userId, email, method, payer, token, installments, payment_method_id, issuer_id } = req.body;
  const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "").replace(/['"]/g, "").trim();
  if (!mpToken) return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado." });

  try {
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const payment = new Payment(client);
    const APP_URL = process.env.APP_URL || `https://${req.get("host")}`;

    const response = await payment.create({
      body: {
        transaction_amount: Number(price) || 15.9,
        description: title || "Assinatura",
        payment_method_id: method || payment_method_id,
        token,
        installments: installments || 1,
        issuer_id,
        external_reference: `${userId}_${planId}_${Date.now()}`,
        notification_url: `${APP_URL}/api/payments/webhook`,
        payer: { ...payer, email: email || payer?.email || "user@example.com" },
      },
      requestOptions: { idempotencyKey: `${userId}_${planId}_${Date.now()}_${Math.random()}` },
    });

    res.json(response);
  } catch (error: any) {
    logger.error({ err: error }, "Erro ao criar pagamento direto do Mercado Pago");
    res.status(500).json({ error: "Erro ao criar pagamento direto.", details: error.message });
  }
});

router.post("/payments/webhook", async (req, res) => {
  const paymentId = req.query.id || req.body?.data?.id;
  const type = req.query.topic || req.body?.type;

  if (type === "payment" && paymentId) {
    try {
      const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "").replace(/['"]/g, "").trim();
      if (!mpToken) return res.status(200).send("Webhook ignored: no token");

      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });

      const payment = response.data;
      if (payment.status === "approved") {
        const extRef = payment.external_reference;
        if (extRef && supabaseAdmin) {
          const [userId, planId] = extRef.split("_");
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          await supabaseAdmin.from("app_settings").update({
            subscription_plan: planId,
            subscription_status: "active",
            subscription_expires_at: expiresAt.toISOString(),
          }).eq("user_id", userId);
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Erro no processamento do webhook MP");
    }
  }
  res.status(200).send("OK");
});

router.post("/webhooks/supabase/onesignal", async (req, res) => {
  const { type, table, record } = req.body;
  if (type !== "INSERT" || (table !== "movies" && table !== "series")) return res.status(200).send("Ignored");

  const title = record.title || record.name;
  const message = "Venha conferir o novo título que acabou de chegar.";
  const heading = `Novo Lançamento no Netprime: ${title}!`;
  const imageUrl = record.backdrop_path ? (record.backdrop_path.startsWith("http") ? record.backdrop_path : `https://image.tmdb.org/t/p/w500${record.backdrop_path}`) : null;
  const APP_URL = process.env.APP_URL || `https://${req.get("host")}`;
  const targetUrl = `${APP_URL}/movie/${record.id}`;
  const appId = process.env.VITE_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey) return res.status(500).json({ error: "ONESIGNAL_REST_API_KEY não configurada." });
  if (!appId) return res.status(500).json({ error: "VITE_ONESIGNAL_APP_ID não configurada." });

  try {
    await axios.post("https://onesignal.com/api/v1/notifications", {
      app_id: appId,
      included_segments: ["Subscribed Users", "All"],
      headings: { en: heading, pt: heading },
      contents: { en: message, pt: message },
      url: targetUrl,
      big_picture: imageUrl,
      chrome_web_image: imageUrl,
    }, { headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Basic ${restApiKey}` } });
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "Erro ao enviar notificação automática OneSignal");
    res.status(500).json({ error: "Falha no webhook" });
  }
});

router.post("/notifications/send", requireAdminSecret, async (req, res) => {
  const { title, message, imageUrl, data } = req.body;
  const appId = process.env.VITE_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!restApiKey) return res.status(500).json({ error: "ONESIGNAL_REST_API_KEY não configurada." });
  if (!appId) return res.status(500).json({ error: "VITE_ONESIGNAL_APP_ID não configurada." });

  try {
    const response = await axios.post("https://onesignal.com/api/v1/notifications", {
      app_id: appId,
      included_segments: ["All"],
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
      big_picture: imageUrl,
      chrome_web_image: imageUrl,
      data: data || {},
    }, { headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Basic ${restApiKey}` } });

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    logger.error({ err: error }, "Erro ao enviar notificação OneSignal");
    res.status(error.response?.status || 500).json({ error: "Falha ao enviar notificação", details: error.response?.data || error.message });
  }
});

router.options("/hls-proxy", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.status(204).end();
});

router.get("/hls-proxy", async (req, res) => {
  let targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("URL is required");

  try {
    while (targetUrl.includes("%25")) targetUrl = decodeURIComponent(targetUrl);
    if (targetUrl.includes("%3A") || targetUrl.includes("%2F")) targetUrl = decodeURIComponent(targetUrl);
  } catch (e) {}

  while (targetUrl.endsWith(".") && !targetUrl.endsWith(".m3u8")) targetUrl = targetUrl.slice(0, -1);

  if (!isAllowedProxyHost(targetUrl)) {
    return res.status(403).send("Proxy target not allowed");
  }

  try {
    const isFromWorker = targetUrl.includes("workers.dev");
    const isTeraApi = targetUrl.includes("tera-api") || targetUrl.includes("iteraplay");
    const isFastStream = targetUrl.includes("fast_stream");
    const isM3U8 = targetUrl.includes(".m3u8") || targetUrl.includes(".isml");
    const isSegment = targetUrl.includes(".ts") || targetUrl.includes(".m4s");

    const proxyHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "video",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
    };

    if (isFromWorker || isTeraApi || isFastStream) {
      proxyHeaders["Referer"] = "https://www.terabox.com/";
      proxyHeaders["Origin"] = "https://www.terabox.com";
    } else {
      proxyHeaders["Referer"] = "https://player.kingx.dev/";
      proxyHeaders["Origin"] = "https://player.kingx.dev";
    }

    if (req.headers.range) proxyHeaders["Range"] = req.headers.range;

    const response = await axios({
      method: "GET",
      url: targetUrl,
      responseType: "stream",
      headers: proxyHeaders,
      timeout: isSegment ? 60000 : 30000,
      validateStatus: () => true,
      maxRedirects: 10,
    });

    const finalUrl = (response.request as any).res?.responseUrl || targetUrl;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Expose-Headers", "*");

    const contentType = (response.headers["content-type"] || "").toLowerCase();
    const isActuallyM3U8 = isM3U8 || contentType.includes("mpegurl") || contentType.includes("application/x-mpegurl");

    if (isActuallyM3U8) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    } else if (isSegment || contentType.includes("video/mp2t")) {
      res.setHeader("Content-Type", "video/mp2t");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }

    ["content-length", "content-range", "accept-ranges", "cache-control"].forEach((h) => {
      if (response.headers[h]) res.setHeader(h, response.headers[h]);
    });

    res.status(response.status);

    if (isActuallyM3U8) {
      let m3u8Data = "";
      response.data.on("data", (chunk: Buffer) => { m3u8Data += chunk.toString(); });
      response.data.on("end", () => {
        const lines = m3u8Data.split("\n");
        const rewrittenLines = lines.map((line) => {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith("#")) {
            let absoluteUri = trimmedLine;
            if (!absoluteUri.startsWith("http")) {
              try {
                const baseUrl = finalUrl.split("?")[0];
                absoluteUri = new URL(absoluteUri, baseUrl).toString();
                if (finalUrl.includes("?") && !absoluteUri.includes("?")) {
                  absoluteUri += "?" + finalUrl.split("?")[1];
                }
              } catch (e) { return line; }
            }
            if (!isAllowedProxyHost(absoluteUri)) return line;
            if (!absoluteUri.includes("/api/hls-proxy")) {
              return `/api/hls-proxy?url=${encodeURIComponent(absoluteUri)}`;
            }
          }
          if (line.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/, (match, p1) => {
              let uri = p1;
              if (!uri.startsWith("http")) {
                try { uri = new URL(uri, finalUrl).toString(); } catch (e) {}
              }
              if (!isAllowedProxyHost(uri)) return match;
              return `URI="/api/hls-proxy?url=${encodeURIComponent(uri)}"`;
            });
          }
          return line;
        });
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(rewrittenLines.join("\n"));
      });
      response.data.on("error", (err: Error) => {
        logger.error({ err }, "M3U8 stream error");
        if (!res.headersSent) res.status(500).send("Stream error");
      });
    } else {
      response.data.pipe(res);
      response.data.on("error", (err: Error) => { logger.error({ err }, "Segment stream error"); res.end(); });
    }
  } catch (e: any) {
    logger.error({ err: e }, "HLS Proxy error");
    if (!res.headersSent) res.status(500).send("Proxy error");
  }
});

router.get("/stream/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY;

  if (!apiKey) {
    return res.status(500).send("Configuração Pendente: Adicione a GOOGLE_DRIVE_API_KEY nos Secrets.");
  }

  try {
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

    const checkRes = await axios.get(url, { headers: { Range: "bytes=0-10" }, timeout: 8000, validateStatus: () => true });

    if (checkRes.status === 403) {
      const data = JSON.stringify(checkRes.data);
      if (data.includes("downloadQuotaExceeded")) {
        return res.status(403).json({ code: "QUOTA_EXCEEDED", message: "Este filme está muito popular hoje! O Google Drive limitou o streaming direto." });
      }
      const confirmMatch = data.match(/confirm=([a-zA-Z0-9-_]+)/);
      if (confirmMatch) url += `&confirm=${confirmMatch[1]}`;
    }

    const response = await axios({ method: "get", url, responseType: "stream", headers: { Range: req.headers.range || "" }, timeout: 60000 });

    if (response.status >= 400) return res.status(response.status).send(`Erro do Google Drive: ${response.status}`);

    const headers: Record<string, string> = {
      "Accept-Ranges": "bytes",
      "Content-Type": response.headers["content-type"]?.includes("matroska") ? "video/webm" : (response.headers["content-type"] || "video/mp4"),
    };

    if (response.headers["content-length"]) headers["Content-Length"] = response.headers["content-length"];
    if (response.headers["content-range"]) headers["Content-Range"] = response.headers["content-range"];

    res.writeHead(response.status, headers);
    response.data.pipe(res);
    response.data.on("error", (err: any) => { logger.error({ err }, "Erro no stream de dados"); res.end(); });
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).send(`Erro no Google Drive: ${error.response.data?.error?.message || "Arquivo não encontrado ou sem permissão."}`);
    } else {
      res.status(500).send("Erro ao conectar com o Google Drive.");
    }
  }
});

router.get("/auth/google/url", (req, res) => {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "VITE_GOOGLE_CLIENT_ID não configurada." });

  const APP_URL = process.env.APP_URL || `https://${req.get("host")}`;
  const redirectUri = `${APP_URL}/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

router.post("/terabox/convert", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL do TeraBox é obrigatória." });

  if (url.includes("player.kingx.dev/#")) {
    const hash = url.split("#")[1];
    if (hash) {
      const params = new URLSearchParams(hash);
      return res.json({
        success: true,
        directUrl: url,
        videoUrl: params.get("video_url") ? decodeURIComponent(params.get("video_url")!) : null,
        subtitleUrl: params.get("subtitle_url") ? decodeURIComponent(params.get("subtitle_url")!) : null,
      });
    }
  }

  try {
    const sources = [
      async () => {
        const converterUrl = `https://www.teraboxdownloader.pro/p/fs.html?q=${encodeURIComponent(url)}&m=1`;
        const response = await axios.get(converterUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            Referer: "https://www.teraboxdownloader.pro/",
          },
          timeout: 10000,
        });
        const html = response.data;
        const kingxMatch = html.match(/https:\/\/player\.kingx\.dev\/#[^"']+/);
        const teradlMatch = html.match(/https:\/\/teradl\.kingx\.dev\/[^"']+/);
        if (kingxMatch || teradlMatch) {
          const directUrl = kingxMatch ? kingxMatch[0] : teradlMatch![0];
          if (teradlMatch && !kingxMatch) return { videoUrl: directUrl };
          const hash = directUrl.split("#")[1];
          if (hash) {
            const params = new URLSearchParams(hash);
            return { directUrl, videoUrl: params.get("video_url") ? decodeURIComponent(params.get("video_url")!) : null, subtitleUrl: params.get("subtitle_url") ? decodeURIComponent(params.get("subtitle_url")!) : null };
          }
          return { directUrl };
        }
        const m3u8Match = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
        if (m3u8Match) return { videoUrl: m3u8Match[0] };
        throw new Error("Padrão não encontrado no teraboxdownloader.pro");
      },
    ];

    for (const source of sources) {
      try {
        const result: any = await source();
        if (result && (result.videoUrl || result.directUrl)) {
          return res.json({ success: true, ...result });
        }
      } catch (e: any) {
        logger.warn({ err: e }, "Fonte falhou");
      }
    }

    res.status(404).json({ error: "Não foi possível converter automaticamente.", details: "Todas as fontes falharam." });
  } catch (error: any) {
    logger.error({ err: error }, "Erro crítico ao converter TeraBox");
    res.status(500).json({ error: "Erro interno ao processar o link.", details: error.message });
  }
});

export default router;
