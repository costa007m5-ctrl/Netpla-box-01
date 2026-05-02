const m3u8Url = "https://teradl.kingx.dev/index.m3u8?url=tRMNSgcV8WTqNFex77yHDpSQmxtPD_M1SQiOq5kuOKISix-CktWIYjGM_191o82TWAI4CFdqgoV1K_bB77C5XiNIvRw0y9S_102fcxxPA1L9c7jgHM9MxbY9Wkyi42VduO-QxHbY4Sek23JEEElcmgppTUe_Ew8GmtQmc-LE3MNygTwv_Sow0uxhA29JhnIAf58Q6JhLAhu4aGru6de3XR28sbYeOMlFV5W4u9iZF8KuNRIHWGkW0VFwWn8hyO7j5Bn55IE0G7e9qRgV6LGHG54feReL3w806zmSjIi7FgErQytcmts_5FVAOjhKeS7u3AG1jahl6zX74QREHIAsnbceBfcGG4iIFUKsYqFBiIZ3sdnB&key=www.teraboxdownloader.pro&expires=1777610842&sign=e3ee892d7f8820044140eef4bda8bee1e4c88d4dfa63db7c7c39cbfe1b8ae700";

async function run() {
    const res = await fetch(m3u8Url, {
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    const text = await res.text();
    const lines = text.split('\n');
    const segmentUrl = lines.find(l => l.startsWith('http'));
    console.log("Segment:", segmentUrl);
    
    if (segmentUrl) {
       const res2 = await fetch(segmentUrl, { 
           method: "HEAD",
           headers: { "User-Agent": "Mozilla/5.0" }
       });
       console.log("Status:", res2.status);
    } else {
        console.log("HLS file text:", text);
    }
}
run();
