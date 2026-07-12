import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wogthnhzdzgblqghwvja.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3Robmh6ZHpnYmxxZ2h3dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzY4MjUsImV4cCI6MjA5OTM1MjgyNX0.drbfHRnTeezViflEaqXDBED6H4zMzSq4-MRyTXHqt1E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);