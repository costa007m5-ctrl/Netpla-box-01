import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const { data: movies } = await supabase.from('movies').select('*').limit(1);
  console.log('movies keys:', movies?.[0] ? Object.keys(movies[0]) : 'no movies');
  
  const { data: appSettings } = await supabase.from('app_settings').select('*').limit(1);
  console.log('app_settings keys:', appSettings?.[0] ? Object.keys(appSettings[0]) : 'no settings');
}

check();
