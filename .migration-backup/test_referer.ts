import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const url = "https://teradl-proxy.teradl3.workers.dev/segment?url=HLQzWIaufaBHSZpWHVSH9Dkt5RiT8rbc8RoFrOGj8hf8h4NT3vH-0EFmWxRweG_jUgrxdsGR7IKsdEFQ7";

  const fetchWithReferer = async (referer: string) => {
      try {
         const res = await fetch(url, { 
             method: "HEAD",
             headers: {
                 "Referer": referer,
                 "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
             }
         });
         console.log(`Status with Referer ${referer}:`, res.status);
      } catch(e: any) {
         console.log(`Fetch failed with Referer ${referer}:`, e.message);
      }
  };

  await fetchWithReferer("https://player.kingx.dev/");
  await fetchWithReferer("https://player.kingx.dev");
  await fetchWithReferer("https://ais-dev-e2af3vfvlgzfk7l66o6wfk-47418394057.us-west2.run.app/");
  await fetchWithReferer("");
}
check();
