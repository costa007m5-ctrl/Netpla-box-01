import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
  const data = await res.json();
  console.log(Object.keys(data));
}
check();
