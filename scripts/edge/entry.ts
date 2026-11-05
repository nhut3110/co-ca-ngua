import { SupabaseRoomStore } from '../../apps/api/src/rooms/room-store.js';
import { createHandler } from './handler.js';
const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) throw new Error('Supabase credentials are required');
Deno.serve(createHandler(new SupabaseRoomStore(url, key)));
