interface Env {
  API_SERVER_URL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const apiBase = context.env.API_SERVER_URL;

  if (!apiBase) {
    return new Response(
      JSON.stringify({ error: "API_SERVER_URL not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(context.request.url);
  const target = `${apiBase.replace(/\/$/, "")}${url.pathname}${url.search}`;

  const reqHeaders = new Headers(context.request.headers);
  reqHeaders.delete("host");

  const upstream = await fetch(target, {
    method: context.request.method,
    headers: reqHeaders,
    body: ["GET", "HEAD"].includes(context.request.method)
      ? undefined
      : context.request.body,
    redirect: "follow",
  });

  const resHeaders = new Headers(upstream.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");
  resHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  resHeaders.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
};
