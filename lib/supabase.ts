import { createClient } from '@supabase/supabase-js';

// Diese Werte findest du in deinem Supabase Dashboard unter Settings -> API
const supabaseUrl = 'https://rqwctjoudtheuvemumih.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_bgL4m91W8H9zRXqvai2teA_tdxyPIKE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);