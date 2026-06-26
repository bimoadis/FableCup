import { getSupabaseClient } from '../scripts/utils/supabase.js';

async function check() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('matches').select('round');
  if (error) console.error(error);
  else {
    const rounds = [...new Set(data.map(d => d.round))];
    console.log("Distinct rounds in DB:", rounds);
  }
}
check();
