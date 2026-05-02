import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const url = "https://teradl-proxy.teradl3.workers.dev/segment?url=HLQzWIaufaBHSZpWHVSH9Dkt5RiT8rbc8RoFrOGj8hf8h4NT3vH-0EFmWxRweG_jUgrxdsGR7IKsdEFQ7";
  try {
     const res = await fetch(url, { headers: { "Referer": "https://player.kingx.dev/" }, method: "HEAD" });
     console.log("Status with Referer:", res.status);
  } catch(e: any) {
     console.log("Fetch failed:", e.message);
  }
}
check();
