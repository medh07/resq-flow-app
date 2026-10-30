import { resqClient } from './client';
import type { Category } from '@/lib/types';
export const backendCategory = (category: Category) => category === 'water' ? 'water_sanitation' : category === 'missing' ? 'missing_person' : category;
export function photoExtension(file: File) {
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[file.type];
  if (!extension || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP image up to 5 MB.');
  return extension;
}
// Store only a payload hash and retry ID, never contact details or report text.
export async function submissionKey(userId: string, payload: object) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const key = `resq-submit:${userId}:${hash}`;
  const existing = sessionStorage.getItem(key);
  const id = existing || crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return { id, key };
}
export async function uploadPhoto(requestId: string, file: File) {
  const extension = photoExtension(file);
  const reserved = await resqClient().rpc('resq_flow_reserve_attachment', { p_request_id: requestId, p_extension: extension });
  if (reserved.error) throw reserved.error;
  const uploaded = await resqClient().storage.from('resq-flow-evidence').upload(reserved.data, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throw uploaded.error;
}
