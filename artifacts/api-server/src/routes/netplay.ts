import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { logger } from "../lib/logger";

const router = Router();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/['"]/g, "").trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").replace(/['"]/g, "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/['"]/g, "").trim();
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const supabasePublic = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const OWNER_EMAIL = "costachristopher31@gmail.com";

async function requireAdminJwt(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!supabaseAdmin || !supabasePublic) {
    res.status(503).json({ error: "Server not configured: Supabase keys missing." });
    return;
  }
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized: no token provided." });
    return;
  }
  const { data, error } = await supabasePublic.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Unauthorized: invalid or expired token." });
    return;
  }
  const email = data.user.email ?? "";
  if (email === OWNER_EMAIL) {
    next();
    return;
  }
  try {
    const { data: adminRow } = await supabaseAdmin
      .from("admin_users")
      .select("email")
      .eq("email", email)
      .single();
    if (adminRow) {
      next();
      return;
    }
  } catch {
  }
  res.status(403).json({ error: "Forbidden: admin access required." });
}

function requireWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Webhook secret not configured." });
    return;
  }
  const provided = req.headers["x-webhook-secret"] as string | undefined;
  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Unauthorized webhook request." });
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
    const qualityOrder = ["1080p", "720p", "480p", "360p"];

    const pickQuality = (obj: any) => {
      const startIdx = qualityOrder.indexOf(preferredQuality);
      const ordered = startIdx >= 0 ? [...qualityOrder.slice(startIdx), ...qualityOrder.slice(0, startIdx)] : qualityOrder;
      for (const q of ordered) {
        if (obj[q]) { return { url: obj[q], quality: q }; }
      }
      return null;
    };

    if (data.list && Array.isArray(data.list)) {
      data.list = data.list.map((item: any) => {
        if (item.fast_stream_url) {
          const picked = pickQuality(item.fast_stream_url);
          if (picked) { item.recommended_url = picked.url; item.recommended_quality = picked.quality; }
        }
        return item;
      });
    } else if (data.fast_stream_url) {
      const picked = pickQuality(data.fast_stream_url);
      if (picked) { data.recommended_url = picked.url; data.recommended_quality = picked.quality; }
    }

    return res.json(data);
  } catch (error: any) {
    logger.error({ err: error }, "Terabox backend error");
    return res.status(500).json({ error: "Failed to fetch from Terabox API", details: error.message });
  }
});

router.get("/debug-env", requireAdminJwt, (req, res) => {
  res.json({
    hasUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasMPToken: !!(process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN),
    NODE_ENV: process.env.NODE_ENV,
    host: req.headers.host,
  });
});

router.get("/admin/users", requireAdminJwt, async (req, res) => {
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
      email: user?.email ?? "",
      whatsapp: user?.user_metadata?.whatsapp || "",
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

router.get("/admin/referrals/requests", requireAdminJwt, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase service key not configured" });
  try {
    const { data, error } = await supabaseAdmin.from("referral_requests").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ requests: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/admin/referrals/approve", requireAdminJwt, async (req, res) => {
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

router.post("/admin/updatesettings", requireAdminJwt, async (req, res) => {
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

router.post("/payments/create-preference", async (req, res): Promise<void> => {
  const { title, price, planId, userId, email } = req.body;
  const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "").replace(/['"]/g, "").trim();
  if (!mpToken) { res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado." }); return; }

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

router.post("/payments/create-payment", async (req, res): Promise<void> => {
  const { title, price, planId, userId, email, method, payer, token, installments, payment_method_id, issuer_id } = req.body;
  const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "").replace(/['"]/g, "").trim();
  if (!mpToken) { res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado." }); return; }

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

router.post("/payments/webhook", async (req, res): Promise<void> => {
  const paymentId = req.query.id || req.body?.data?.id;
  const type = req.query.topic || req.body?.type;

  if (type === "payment" && paymentId) {
    try {
      const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "").replace(/['"]/g, "").trim();
      if (!mpToken) { res.status(200).send("Webhook ignored: no token"); return; }

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

router.post("/webhooks/supabase/onesignal", requireWebhookSecret, async (req, res): Promise<void> => {
  const { type, table, record } = req.body;
  if (type !== "INSERT" || (table !== "movies" && table !== "series")) { res.status(200).send("Ignored"); return; }

  const title = record.title || record.name;
  const message = "Venha conferir o novo título que acabou de chegar.";
  const heading = `Novo Lançamento no Netprime: ${title}!`;
  const imageUrl = record.backdrop_path ? (record.backdrop_path.startsWith("http") ? record.backdrop_path : `https://image.tmdb.org/t/p/w500${record.backdrop_path}`) : null;
  const APP_URL = process.env.APP_URL || `https://${req.get("host")}`;
  const targetUrl = `${APP_URL}/movie/${record.id}`;
  const appId = process.env.VITE_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey) { res.status(500).json({ error: "ONESIGNAL_REST_API_KEY não configurada." }); return; }
  if (!appId) { res.status(500).json({ error: "VITE_ONESIGNAL_APP_ID não configurada." }); return; }

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

router.post("/notifications/send", requireAdminJwt, async (req, res): Promise<void> => {
  const { title, message, imageUrl, data } = req.body;
  const appId = process.env.VITE_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!restApiKey) { res.status(500).json({ error: "ONESIGNAL_REST_API_KEY não configurada." }); return; }
  if (!appId) { res.status(500).json({ error: "VITE_ONESIGNAL_APP_ID não configurada." }); return; }

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

router.get("/hls-proxy", async (req, res): Promise<void> => {
  let targetUrl = req.query.url as string;
  if (!targetUrl) { res.status(400).send("URL is required"); return; }

  try {
    while (targetUrl.includes("%25")) targetUrl = decodeURIComponent(targetUrl);
    if (targetUrl.includes("%3A") || targetUrl.includes("%2F")) targetUrl = decodeURIComponent(targetUrl);
  } catch (e) {}

  while (targetUrl.endsWith(".") && !targetUrl.endsWith(".m3u8")) targetUrl = targetUrl.slice(0, -1);

  if (!isAllowedProxyHost(targetUrl)) {
    res.status(403).send("Proxy target not allowed"); return;
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

    const contentType = (String(response.headers["content-type"] || "")).toLowerCase();
    const isActuallyM3U8 = isM3U8 || contentType.includes("mpegurl") || contentType.includes("application/x-mpegurl");

    if (isActuallyM3U8) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    } else if (isSegment || contentType.includes("video/mp2t")) {
      res.setHeader("Content-Type", "video/mp2t");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }

    ["content-length", "content-range", "accept-ranges", "cache-control"].forEach((h) => {
      const v = response.headers[h];
      if (v != null) res.setHeader(h, String(v));
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

router.get("/stream/:fileId", async (req, res): Promise<void> => {
  const { fileId } = req.params;
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY;

  if (!apiKey) {
    res.status(500).send("Configuração Pendente: Adicione a GOOGLE_DRIVE_API_KEY nos Secrets."); return;
  }

  try {
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

    const checkRes = await axios.get(url, { headers: { Range: "bytes=0-10" }, timeout: 8000, validateStatus: () => true });

    if (checkRes.status === 403) {
      const data = JSON.stringify(checkRes.data);
      if (data.includes("downloadQuotaExceeded")) {
        res.status(403).json({ code: "QUOTA_EXCEEDED", message: "Este filme está muito popular hoje! O Google Drive limitou o streaming direto." }); return;
      }
      const confirmMatch = data.match(/confirm=([a-zA-Z0-9-_]+)/);
      if (confirmMatch) url += `&confirm=${confirmMatch[1]}`;
    }

    const response = await axios({ method: "get", url, responseType: "stream", headers: { Range: req.headers.range || "" }, timeout: 60000 });

    if (response.status >= 400) { res.status(response.status).send(`Erro do Google Drive: ${response.status}`); return; }

    const rawContentType = String(response.headers["content-type"] || "");
    const headers: Record<string, string> = {
      "Accept-Ranges": "bytes",
      "Content-Type": rawContentType.includes("matroska") ? "video/webm" : (rawContentType || "video/mp4"),
    };

    const cl = response.headers["content-length"];
    if (cl != null) headers["Content-Length"] = String(cl);
    const cr = response.headers["content-range"];
    if (cr != null) headers["Content-Range"] = String(cr);

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

router.get("/auth/google/url", (req, res): void => {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) { res.status(500).json({ error: "VITE_GOOGLE_CLIENT_ID não configurada." }); return; }

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

router.post("/terabox/convert", async (req, res): Promise<void> => {
  const { url } = req.body;
  if (!url) { res.status(400).json({ error: "URL do TeraBox é obrigatória." }); return; }

  if (url.includes("player.kingx.dev/#")) {
    const hash = url.split("#")[1];
    if (hash) {
      const params = new URLSearchParams(hash);
      res.json({
        success: true,
        directUrl: url,
        videoUrl: params.get("video_url") ? decodeURIComponent(params.get("video_url")!) : null,
        subtitleUrl: params.get("subtitle_url") ? decodeURIComponent(params.get("subtitle_url")!) : null,
      });
      return;
    }
  }

  try {
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
      if (teradlMatch && !kingxMatch) { res.json({ success: true, videoUrl: directUrl }); return; }
      const hash = directUrl.split("#")[1];
      if (hash) {
        const params = new URLSearchParams(hash);
        res.json({
          success: true,
          directUrl,
          videoUrl: params.get("video_url") ? decodeURIComponent(params.get("video_url")!) : null,
          subtitleUrl: params.get("subtitle_url") ? decodeURIComponent(params.get("subtitle_url")!) : null,
        });
        return;
      }
      res.json({ success: true, directUrl });
      return;
    }
    const m3u8Match = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
    if (m3u8Match) { res.json({ success: true, videoUrl: m3u8Match[0] }); return; }

    res.status(404).json({ error: "Não foi possível converter automaticamente.", details: "Padrão não encontrado." });
  } catch (error: any) {
    logger.error({ err: error }, "Erro crítico ao converter TeraBox");
    res.status(500).json({ error: "Erro interno ao processar o link.", details: error.message });
  }
});

export default router;
