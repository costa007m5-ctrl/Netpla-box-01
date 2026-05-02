import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use((req, res, next) => {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {}
    }
    return next();
  }
  express.json()(req, res, next);
});

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/['"]/g, '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, '').trim();
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const router = express.Router();

router.get('/debug-env', (req, res) => {
  res.json({
    hasUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasMPToken: !!process.env.MERCADO_PAGO_ACCESS_TOKEN || !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    host: req.headers.host,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl
  });
});

router.get('/admin/users', async (req, res) => {
  if (supabaseAdmin) {
     try {
       const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
       if (error) return res.status(500).json({ error: error.message });
       const { data: settings } = await supabaseAdmin.from('app_settings').select('*');
       return res.json({ users, settings });
     } catch (error: any) {
       return res.status(500).json({ error: error.message });
     }
  } else {
     return res.status(500).json({ error: "Supabase service key not configured" });
  }
});

router.post('/admin/updatesettings', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase service key not configured" });
  const { userId, plan, status, expiresAt } = req.body;
  
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : null;
    
    // Instead of single() which throws PGRST116 on 0 rows, use upsert
    const { error: upsertErr } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        user_id: userId,
        subscription_plan: plan,
        subscription_status: status,
        subscription_expires_at: expiresAtIso,
        theme: 'dark',
        language: 'pt-BR',
        autoplay_next: true,
        show_logos: true
      }, { onConflict: 'user_id' });
      
    if (upsertErr) {
      console.error("Upsert erro:", upsertErr);
      throw upsertErr;
    }
    
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/referrals', async (req, res) => {
  const { userId } = req.query;
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const userList = users as any[];
    const referredUsers = userList.filter(u => u.user_metadata?.referred_by === userId);
    const count = referredUsers.length;
    const credits = count * 3;
    const freeMonths = Math.floor(count / 5);

    const { data: pendingReq } = await supabaseAdmin
      .from('referral_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');

    res.json({ count, credits, freeMonths, pending: pendingReq?.length ? pendingReq[0] : null });
  } catch (err: any) {
    if (err.code === '42P01') {
       return res.json({ count: 0, credits: 0, freeMonths: 0, pending: null, error: 'Table referral_requests missing' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/referrals/redeem', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });
  const { userId, count, credits, freeMonths } = req.body;
  try {
    const { data: { user }, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (uErr) throw uErr;

    const { error } = await supabaseAdmin.from('referral_requests').insert({
      user_id: userId,
      email: user.email,
      whatsapp: user.user_metadata?.whatsapp || '',
      referral_count: count,
      credits,
      free_months: freeMonths,
      status: 'pending'
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/referrals/requests', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });
  try {
    const { data, error } = await supabaseAdmin.from('referral_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/referrals/approve', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });
  const { requestId, status } = req.body;
  try {
    const { error } = await supabaseAdmin.from('referral_requests').update({ status }).eq('id', requestId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payments/create-preference', async (req, res) => {
  const { title, price, planId, userId, email } = req.body;
  const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').replace(/['"]/g, '').trim();
  if (!mpToken) return res.status(500).json({ error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado.' });
  try {
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);
    const APP_URL = process.env.APP_URL || `https://${req.headers.host}`;
    const response = await preference.create({
      body: {
        items: [{ id: planId || 'hub', title: title || 'Assinatura', quantity: 1, unit_price: Number(price) || 15.9, currency_id: 'BRL' }],
        payer: { email: email || 'test@test.com' },
        back_urls: {
          success: `${APP_URL}/menu?payment=success&plan=${planId}`,
          failure: `${APP_URL}/menu?payment=failure`,
          pending: `${APP_URL}/menu?payment=pending`
        },
        auto_return: 'approved',
        external_reference: `${userId}_${planId}_${Date.now()}`,
        notification_url: `${APP_URL}/api/payments/webhook`,
        payment_methods: { excluded_payment_methods: [], excluded_payment_types: [], installments: 1 }
      }
    });
    res.json({ id: response.id, init_point: response.init_point });
  } catch (error: any) {
    console.error('Erro MP:', error);
    res.status(500).json({ error: error.message || 'Erro criando preferência MP', details: error });
  }
});

router.post('/payments/create-payment', async (req, res) => {
  const { title, price, planId, userId, email, method, payer, token, installments, payment_method_id, issuer_id } = req.body;
  const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').replace(/['"]/g, '').trim();
  if (!mpToken) return res.status(500).json({ error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado.' });
  try {
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const payment = new Payment(client);
    const APP_URL = process.env.APP_URL || `https://${req.headers.host}`;
    const response = await payment.create({
      body: {
        transaction_amount: Number(price) || 15.9,
        description: title || 'Assinatura',
        payment_method_id: method || payment_method_id,
        token: token,
        installments: installments || 1,
        issuer_id: issuer_id,
        external_reference: `${userId}_${planId}_${Date.now()}`,
        notification_url: `${APP_URL}/api/payments/webhook`,
        payer: { ...payer, email: email || payer?.email || 'user@example.com' }
      },
      requestOptions: { idempotencyKey: `${userId}_${planId}_${Date.now()}_${Math.random()}` }
    });
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro MP Direto', details: error.message });
  }
});

router.post('/payments/webhook', async (req, res) => {
  const paymentId = req.query.id || req.body?.data?.id;
  const type = req.query.topic || req.body?.type;
  if (type === 'payment' && paymentId) {
    try {
      const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').replace(/['"]/g, '').trim();
      if (!mpToken) return res.status(200).send('No token');
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}` }
      });
      const payment = response.data;
      if (payment.status === 'approved') {
        const extRef = payment.external_reference;
        if (extRef && supabaseAdmin) {
          const [userId, planId] = extRef.split('_');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          await supabaseAdmin.from('app_settings').update({ 
            subscription_plan: planId, 
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString()
          }).eq('user_id', userId);
        }
      }
    } catch (error) {}
  }
  res.status(200).send('OK');
});

router.post('/notifications/send', async (req, res) => {
  const { title, message, imageUrl, data } = req.body;
  const appId = process.env.VITE_ONESIGNAL_APP_ID || '581f23c1-2b57-4646-8780-6cd2ccbba30e';
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!restApiKey) return res.status(500).json({ error: 'Sem key' });
  try {
    const response = await axios.post('https://onesignal.com/api/v1/notifications', {
      app_id: appId,
      included_segments: ['All'],
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
      big_picture: imageUrl,
      chrome_web_image: imageUrl,
      data: data || {},
    }, { headers: { 'Content-Type': 'application/json', Authorization: `Basic ${restApiKey}` } });
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro OneSignal' });
  }
});

router.get('/hls-proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send('URL is required');

  try {
    const isM3U8 = targetUrl.includes('.m3u8') || targetUrl.includes('.isml');
    const isFromWorker = targetUrl.includes('workers.dev');
    const proxyHeaders: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7',
      'Connection': 'keep-alive',
      'Referer': isFromWorker ? 'https://www.terabox.com/' : 'https://player.kingx.dev/',
      'Origin': isFromWorker ? 'https://www.terabox.com' : 'https://player.kingx.dev',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    if (isFromWorker) {
      // Some workers need exact headers
      proxyHeaders['Upgrade-Insecure-Requests'] = '1';
      proxyHeaders['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
      proxyHeaders['Sec-Ch-Ua-Mobile'] = '?0';
      proxyHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
    }

    if (req.headers.range) proxyHeaders.range = req.headers.range;

    const response = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'stream',
      headers: {
        ...proxyHeaders,
        'X-Real-IP': req.ip || '127.0.0.1',
        'X-Forwarded-For': req.ip || '127.0.0.1',
      },
      timeout: 120000, 
      validateStatus: () => true,
      maxRedirects: 10,
    });

    const finalUrl = (response.request as any).res?.responseUrl || targetUrl;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    
    const contentType = (response.headers['content-type'] || '').toLowerCase();
    const isActuallyM3U8 = isM3U8 || contentType.includes('mpegurl') || contentType.includes('application/x-mpegurl');

    if (isActuallyM3U8) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (targetUrl.includes('.ts') || contentType.includes('video/mp2t')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    const headersToCopy = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
    headersToCopy.forEach(h => { if (response.headers[h]) res.setHeader(h, response.headers[h]); });

    res.status(response.status);

    if (isActuallyM3U8) {
      let m3u8Data = '';
      response.data.on('data', (chunk: Buffer) => { m3u8Data += chunk.toString(); });
      response.data.on('end', () => {
           const lines = m3u8Data.split('\n');
           const rewrittenLines = lines.map(line => {
              const trimmedLine = line.trim();
              if (trimmedLine && !trimmedLine.startsWith('#')) {
                  let absoluteUri = trimmedLine;
                  if (!absoluteUri.startsWith('http')) {
                       try {
                         const baseUrl = finalUrl.split('?')[0];
                         absoluteUri = new URL(absoluteUri, baseUrl).toString();
                         if (finalUrl.includes('?')) {
                            const originalParams = finalUrl.split('?')[1];
                            if (!absoluteUri.includes('?')) {
                                absoluteUri += (absoluteUri.includes('?') ? '&' : '?') + originalParams;
                            }
                         }
                       } catch(e) { return line; }
                  }
                  if (!absoluteUri.includes('/api/hls-proxy')) {
                    return `/api/hls-proxy?url=${encodeURIComponent(absoluteUri)}`;
                  }
              }
              if (line.includes('URI="')) {
                return line.replace(/URI="([^"]+)"/, (match, p1) => {
                  let uri = p1;
                  if (!uri.startsWith('http')) {
                    try {
                      uri = new URL(uri, finalUrl).toString();
                    } catch(e) {}
                  }
                  return `URI="/api/hls-proxy?url=${encodeURIComponent(uri)}"`;
                });
              }
              return line;
           });
           res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
           res.send(rewrittenLines.join('\n'));
      });
    } else {
      response.data.pipe(res);
    }
  } catch (e: any) {
    if (!res.headersSent) res.status(500).send('Proxy error');
  }
});

router.get('/stream/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const apiKey = (process.env.GOOGLE_DRIVE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY || '').replace(/['"]/g, '').trim();

  if (!apiKey) {
    return res.status(500).send('Configuração Pendente: Adicione a GOOGLE_DRIVE_API_KEY.');
  }

  try {
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    
    const checkRes = await axios.get(url, { 
      headers: { Range: 'bytes=0-10' },
      timeout: 8000,
      validateStatus: () => true 
    });

    if (checkRes.status === 403) {
      const data = JSON.stringify(checkRes.data);
      if (data.includes('downloadQuotaExceeded')) {
        return res.status(403).json({ 
          code: 'QUOTA_EXCEEDED', 
          message: 'Este filme está muito popular hoje! O Google Drive limitou o streaming direto.' 
        });
      }
      const confirmMatch = data.match(/confirm=([a-zA-Z0-9-_]+)/);
      if (confirmMatch) {
        url += `&confirm=${confirmMatch[1]}`;
      }
    }

    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: { Range: req.headers.range || '' },
      timeout: 60000
    });

    if (response.status >= 400) {
      return res.status(response.status).send(`Erro do Google Drive: ${response.status}`);
    }

    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Content-Type': response.headers['content-type']?.includes('matroska') ? 'video/webm' : (response.headers['content-type'] || 'video/mp4'),
    };

    if (response.headers['content-length']) headers['Content-Length'] = response.headers['content-length'];
    if (response.headers['content-range']) headers['Content-Range'] = response.headers['content-range'];

    res.writeHead(response.status, headers);
    response.data.pipe(res);
  } catch (error: any) {
    res.status(500).send('Erro ao conectar com o Google Drive.');
  }
});

router.get('/auth/google/url', (req, res) => {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'ClientId missing' });
  const APP_URL = process.env.APP_URL || `https://${req.headers.host}`;
  const redirectUri = `${APP_URL}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

router.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    const APP_URL = process.env.APP_URL || `https://${req.headers.host}`;
    const redirectUri = `${APP_URL}/auth/google/callback`;

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = response.data;
      const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const { email } = userRes.data;

      const accountData = {
        email,
        access_token,
        refresh_token,
        expiry_date: Date.now() + (expires_in * 1000)
      };

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_DRIVE_AUTH_SUCCESS', payload: ${JSON.stringify(accountData)} }, '*');
            window.close();
          } else { window.location.href = '/'; }
        </script></body></html>
      `);
    } catch (error) {
      res.status(500).send('Erro na autenticação.');
    }
});

router.post('/webhooks/supabase/onesignal', async (req, res) => {
    const { type, table, record } = req.body;
    if (type !== 'INSERT' || (table !== 'movies' && table !== 'series')) return res.send('Ignored');

    const title = record.title || record.name;
    const heading = `Novo Lançamento: ${title}!`;
    const imageUrl = record.backdrop_path ? (record.backdrop_path.startsWith('http') ? record.backdrop_path : `https://image.tmdb.org/t/p/w500${record.backdrop_path}`) : null;
    const APP_URL = process.env.APP_URL || `https://${req.headers.host}`;
    const appId = process.env.VITE_ONESIGNAL_APP_ID || '581f23c1-2b57-4646-8780-6cd2ccbba30e';
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!restApiKey) return res.status(500).json({ error: 'ONESIGNAL_REST_API_KEY missing' });

    try {
      await axios.post('https://onesignal.com/api/v1/notifications', {
        app_id: appId,
        included_segments: ['All'],
        headings: { en: heading, pt: heading },
        contents: { en: 'Confira o novo título!', pt: 'Confira o novo título!' },
        url: `${APP_URL}/movie/${record.id}`,
        big_picture: imageUrl,
        chrome_web_image: imageUrl
      }, { headers: { Authorization: `Basic ${restApiKey}` } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Falha webhook' });
    }
});

router.get('/terabox-pro', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const apiKey = process.env.TERABOX_PRO_API_KEY || 'sk_6d7363a619840df0a07afe194613bf9a';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  try {
    const response = await axios.get(`https://xapiverse.com/api/terabox-pro?url=${encodeURIComponent(url as string)}`, {
      headers: {
         'Content-Type': 'application/json',
         'xAPIverse-Key': apiKey
      }
    });
    return res.json(response.data);
  } catch (error: any) {
    console.error('Terabox Vercel error:', error?.response?.data || error.message);
    
    let detailsFormat = error.message;
    if (error?.response?.data) {
        detailsFormat = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
    }
    return res.status(500).json({ error: 'Failed to fetch from Terabox API (Vercel)', details: detailsFormat });
  }
});

router.post('/terabox/convert', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL do TeraBox é obrigatória.' });

  if (url.includes('player.kingx.dev/#')) {
    const hash = url.split('#')[1];
    if (hash) {
      const params = new URLSearchParams(hash);
      return res.json({ 
        success: true, 
        directUrl: url,
        videoUrl: params.get('video_url') ? decodeURIComponent(params.get('video_url') as string) : null,
        subtitleUrl: params.get('subtitle_url') ? decodeURIComponent(params.get('subtitle_url') as string) : null
      });
    }
  }

  try {
    const sources = [
      async () => {
        const converterUrl = `https://www.teraboxdownloader.pro/p/fs.html?q=${encodeURIComponent(url)}&m=1`;
        const response = await axios.get(converterUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Referer': 'https://www.teraboxdownloader.pro/'
          },
          timeout: 10000
        });
        const html = response.data;
        const kingxMatch = html.match(/https:\/\/player\.kingx\.dev\/#[^"']+/);
        const teradlMatch = html.match(/https:\/\/teradl\.kingx\.dev\/[^"']+/);
        
        if (kingxMatch || teradlMatch) {
          const directUrl = kingxMatch ? kingxMatch[0] : teradlMatch![0];
          if (teradlMatch && !kingxMatch) return { videoUrl: directUrl };
          const hash = directUrl.split('#')[1];
          if (hash) {
            const params = new URLSearchParams(hash);
            return { 
              directUrl,
              videoUrl: params.get('video_url') ? decodeURIComponent(params.get('video_url') as string) : null,
              subtitleUrl: params.get('subtitle_url') ? decodeURIComponent(params.get('subtitle_url') as string) : null
            };
          }
          return { directUrl };
        }
        const m3u8Match = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
        if (m3u8Match) return { videoUrl: m3u8Match[0] };
        throw new Error('Padrão não encontrado no teraboxdownloader.pro');
      },
      async () => {
        const bypassUrl = `https://terabox-downloader.com/api/get-info?url=${encodeURIComponent(url)}`;
        try {
          const response = await axios.get(bypassUrl, { timeout: 8000 });
          if (response.data && response.data.stream_url) {
            return { videoUrl: response.data.stream_url };
          }
        } catch (e) {}
        throw new Error('Falha no bypass secundário');
      }
    ];

    for (const source of sources) {
      try {
        const result: any = await source();
        if (result && (result.videoUrl || result.directUrl)) {
          return res.json({ success: true, ...result });
        }
      } catch (e: any) {}
    }

    res.status(404).json({ error: 'Não foi possível converter automaticamente em Vercel.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro TeraBox Vercel' });
  }
});

app.use('/api', router);
app.use('/', router);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found in express', url: req.url, originalUrl: req.originalUrl, path: req.path });
});

export default app;
