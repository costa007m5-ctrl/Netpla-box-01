import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  try {
    const { data: movies, error: errorMovie } = await supabase.from('movies').select('collection_logo_path').limit(1);
    console.log('movies collection_logo_path check:', errorMovie ? errorMovie.message : 'OK');
  } catch(e) { console.log(e); }
  
  try {
    const { data: appSettings, error: errorApp } = await supabase.from('app_settings').select('category_backdrops').limit(1);
    console.log('app_settings category_backdrops check:', errorApp ? errorApp.message : 'OK');
  } catch(e) { console.log(e); }
}

check();
