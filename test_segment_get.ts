import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const url = "https://teradl-proxy.relieved7885.workers.dev/segment?url=lJ4XeeFaG3ghAQkNl8xbivQIYwCtgceq5ZK8Ldn35ZD7lAot0IyJOx9GE4IEyMTFgtxvRPle2CzHV8-kpG0BNfHzaGfhzNacRS16_hKxIvCMXo7QQ7hk6acW17NICrh0ZUwXGVnUpAMJIX_ilFDCmKD7zHPcvZqyaWuXlnRM1IvGUj1V-IkS6gO7Jfxkrx5Eur6kHpQG2NksTKCaPnTp-Btmb3oLee_Rlk4nG-mSOBWdVaYKXhsIurZamiUjhdTR3Zm04VgslyPzw18MwgNSsEL7yeGvv3xijI6UCbrtCPbBt3Av4NdQ-JiK4a-YDFjwSSs7w_mAf7XrfiwgebZdyi_VIpktsaXEmp6R5YwQ2LkXSVvIAY22cUDemSS3TpHWVrmz006-Yv6-J51WJe9voiWHuuf_6UJMGqWst-BzK_Ag9kY_21-2n9qPxsbBUfOItQQx5IzNIbnQjK7JGoa8tusgeOG_dOqkIilFKNqAbVuktFAAtL6KRaL_geBpGOzXjNGMbl4Wxo06u1wZnKtwQFpqS1d-QBvmu0XQt9BWGlb8rbHch7pWe3q-dvHvqUj6H5fQNvvkyPrfcEakClnMFJIj-uSxpAe7Y41KF3iVc4xOm8lXnSaT0SlWWoJc3mg_BvWH3YnLhkDCc6MBlTydGSTGy4ZZ2oTs9fbObnZYzWQx2Bn0mGZqFTWnvbzK8A8YG9flc3iRSztOFRrDsQ-yje63hmp4uN5z9w1iZkYVXlaZcV5hvRsErvU0EWqokOcaclaEzUyA60_WpkJF5c_-WmKddIw37gQOpmBlIWitKHp34mw1NT0bTgPQLP7n96ii_QXS5pk00gmvWtGXEvEphbsP-Mr3q5qJb3qnPDwvOz-RKpMQIG4mn8HC_bIHl_JmiWDG4GfwYITILveVwy3jqvykMYuEonRKYQ6EOkhwJ8KJ5QueeCDNKoxmj8jevCOvdSg1CyYZf4aa49PMy4Qd3MTDpU-MBxB2MyKXqFQN-3nk8gjfNOoMt1OwFwYGreKiofdrsR9eEFVn2bKVhXXCFrVhf8SMsS5tyFwwhCfedLcpgEez025QLVUz3-L8EeZlgxDcTjshHKbCtQE9juVSuX9Ed3slYF1G9jcod2v8yzs9hnU6_WbUJ9PYVPBrS_o4OmyrFqnpvxBE5glMNOF9vduMieE1PRxED1P-oxWYrEgxiRCno1Xl2-Va2uEYI9_M6TtR8NYc3KZAuQ31WFvoihl1-vAevlp2nocy5b6AUpWYOjBEXCOI2NFos8Ntu3fI9kSkcwVxg3wt5166hdYl_ZMA48rpnr9jdgMJgG7SermtnzKFRy0wJX5wsgLcEGvy2C0Knzx_5P-Vqz2Fhmvr_oIIg0sfUHiN4dDPrLD5QwP3XG29jC-BV2gP3N-McA==&sign=b9e7a46f473481f7df55e1dbcc5623f5c6c84dc1ba725590156467332dd64ef2";

  console.log("No Referer:");
  try {
     const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
     console.log("Status:", res.status);
  } catch(e) {}

  console.log("With Referer player.kingx.dev:");
  try {
     const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://player.kingx.dev/" } });
     console.log("Status:", res.status);
  } catch(e) {}

  console.log("With Referer anything else:");
  try {
     const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://localhost:3000/" } });
     console.log("Status:", res.status);
  } catch(e) {}
}
check();
