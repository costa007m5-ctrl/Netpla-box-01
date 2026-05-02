import dotenv from 'dotenv';
import { request } from 'https';
dotenv.config();

function checkOptions(url: string) {
  const req = request(url, { method: 'OPTIONS' }, (res) => {
    console.log("OPTIONS status:", res.statusCode);
    console.log("OPTIONS headers:", res.headers);
  });
  req.on('error', e => console.error(e));
  req.end();
}

checkOptions("https://teradl.kingx.dev/index.m3u8?url=tRMNSgcV8WTqNFex77yHDpSQmxtPD_M1SQiOq5kuOKISix-CktWIYjGM_191o82TWAI4CFdqgoV1K_bB77C5XiNIvRw0y9S_102fcxxPA1L9c7jgHM9MxbY9Wkyi42VduO-QxHbY4Sek23JEEElcmgppTUe_Ew8GmtQmc-LE3MNygTwv_Sow0uxhA29JhnIAf58Q6JhLAhu4aGru6de3XR28sbYeOMlFV5W4u9iZF8KuNRIHWGkW0VFwWn8hyO7j5Bn55IE0G7e9qRgV6LGHG54feReL3w806zmSjIi7FgErQytcmts_5FVAOjhKeS7u3AG1jahl6zX74QREHIAsnbceBfcGG4iIFUKsYqFBiIZ3sdnB&key=www.teraboxdownloader.pro&expires=1777610842&sign=e3ee892d7f8820044140eef4bda8bee1e4c88d4dfa63db7c7c39cbfe1b8ae700");
