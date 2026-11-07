import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY solo en el entorno privado.');
if (!serviceKey.startsWith('eyJ') && !serviceKey.startsWith('sb_secret_')) throw new Error('La clave Supabase debe ser service_role/secret y no se guarda en Git.');

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const passwordFor = (name) => process.env[name] || `Tj!${crypto.randomBytes(18).toString('base64url')}#26`;
const credentialPath = 'demo-credentials.local';
let previousCredentials = '';
try { previousCredentials = await fs.readFile(credentialPath, 'utf8'); } catch { /* first run */ }
const accounts = [
  { key: 'DEMO_TURISTA_PASSWORD', email: 'turista.demo.cajamarca@gmail.com', name: 'Turista Demo', role: 'turista' },
  { key: 'DEMO_PRESTADOR_PASSWORD', email: 'prestador.demo.cajamarca@gmail.com', name: 'Prestador Demo', role: 'prestador_turistico' },
  { key: 'DEMO_MODERADOR_PASSWORD', email: 'moderador.demo.cajamarca@gmail.com', name: 'Moderador Demo', role: 'moderador' },
].map((account) => ({ ...account, password: passwordFor(account.key), created: false }));

const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
for (const account of accounts) {
  const existing = listed.users.find((user) => user.email?.toLowerCase() === account.email);
  if (existing) {
    const app = existing.app_metadata?.application;
    if (app !== 'turismo-cajamarca') throw new Error(`La cuenta existente ${account.email} no está marcada como demo de Turismo; no se modifica.`);
    account.id = existing.id;
    account.created = false;
    const match = previousCredentials.match(new RegExp(`${account.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?\\nPassword: ([^\\r\\n]+)`));
    if (!process.env[account.key] && match) account.password = match[1];
  }
  else {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.name, application: 'turismo-cajamarca' },
      app_metadata: { application: 'turismo-cajamarca' },
    });
    if (error) throw error;
    account.id = data.user.id;
    account.created = true;
    const record = `${account.role}: ${account.email}\nPassword: ${account.password}\nCreated now\n\n`;
    await fs.appendFile(credentialPath, record, { mode: 0o600 });
    previousCredentials += record;
  }
}

const { data: roles, error: rolesError } = await admin.from('turismo_roles').select('id,code').in('code', accounts.map((a) => a.role));
if (rolesError) throw rolesError;
const roleId = Object.fromEntries(roles.map((role) => [role.code, role.id]));
for (const account of accounts.filter((a) => a.role !== 'turista')) {
  const { error: clearError } = await admin.from('turismo_user_roles').update({ is_primary: false }).eq('user_id', account.id).eq('is_active', true);
  if (clearError) throw clearError;
  const { error } = await admin.from('turismo_user_roles').upsert({ user_id: account.id, role_id: roleId[account.role], is_active: true, is_primary: true }, { onConflict: 'user_id,role_id' });
  if (error) throw error;
}

const provider = accounts.find((a) => a.role === 'prestador_turistico');
const { error: providerError } = await admin.from('turismo_provider_profiles').upsert({
  profile_id: provider.id, ruc: 'DEMO-900000001', razon_social: 'Experiencias Cajamarca Demo',
  nombre_comercial: 'Anaime Andino Demo', sub_type: 'agencia_viajes', rnt_status: 'verificado', address: 'Anaime, Cajamarca - Tolima',
}, { onConflict: 'profile_id' });
if (providerError) throw providerError;

let { data: item, error: itemError } = await admin.from('turismo_catalog_items').select('id,provider_id,metadata').eq('slug', 'sendero-anaime-demo').maybeSingle();
if (itemError) throw itemError;
if (item && (item.provider_id !== provider.id || item.metadata?.demo !== true)) throw new Error('El slug demo existente pertenece a otro registro; no se modifica.');
if (!item) {
  ({ data: item, error: itemError } = await admin.from('turismo_catalog_items').insert({
    provider_id: provider.id, item_type: 'tour', title: 'Sendero Anaime Demo', slug: 'sendero-anaime-demo', category: 'Naturaleza',
    short_description: 'Recorrido ficticio por el cañón de Anaime para demostración.', description: 'Experiencia ilustrativa; no corresponde a una oferta comercial real.',
    location: 'Anaime, Cajamarca - Tolima', cover_image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', price_from: 85000,
    price_label: 'Desde $85.000 COP', duration_text: '4 horas', difficulty: 'moderado', is_reservable: true, status: 'published', is_featured: true,
    published_at: new Date().toISOString(), metadata: { demo: true },
  }).select('id').single());
  if (itemError) throw itemError;
}
const { error: availabilityError } = await admin.from('turismo_catalog_availability').upsert({ item_id: item.id, available_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), is_available: true, capacity: 12, price_override: 85000, notes: 'Fecha ficticia para demostración' }, { onConflict: 'item_id,available_date' });
if (availabilityError) throw availabilityError;

const currentCredentials = accounts.filter((a) => a.created || process.env[a.key]).map((a) => `${a.role}: ${a.email}\nPassword: ${a.password}\n${a.created ? 'Created now' : 'Password supplied by operator'}\n`).join('\n');
if (currentCredentials || !previousCredentials) {
  await fs.writeFile(credentialPath, `${previousCredentials && currentCredentials ? `${previousCredentials.replace(/\n+$/, '')}\n\n` : previousCredentials}${currentCredentials || 'All demo accounts already existed; passwords were not exported.\n'}`, { mode: 0o600 });
}
console.log(JSON.stringify(accounts.map(({ role, email, id, created }) => ({ role, email, id, created }))));
