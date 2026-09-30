import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '@/lib/config/env';
import { getDocsBucket, isSupabaseStorageConfigured } from './supabase';

export interface UploadedFile {
  storagePath: string;
  byteSize: number;
}

/**
 * Upload a document file to Supabase Storage.
 *
 * Path format: <YYYY-MM-DD>/<uuid>-<sanitized-filename>
 * - Date prefix groups by upload day
 * - UUID prevents collisions
 * - Sanitized name preserves human readability
 *
 * @throws Error if upload fails
 */
export async function uploadDocumentFile(
  buffer: Buffer,
  filename: string,
  mime: string,
): Promise<UploadedFile> {
  // Sanitize filename: replace non-word chars with underscore
  const safeName = filename.replace(/[^\w.\-]/g, '_');

  // Generate path: 2026-05-10/uuid-filename.pdf
  const dateStr = new Date().toISOString().slice(0, 10);
  const uuid = randomUUID();
  const storagePath = `${dateStr}/${uuid}-${safeName}`;

  if (isSupabaseStorageConfigured()) {
    try {
      const docsBucket = getDocsBucket();
      const { error } = await docsBucket.upload(storagePath, buffer, {
        contentType: mime,
        upsert: false,
      });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      return { storagePath, byteSize: buffer.length };
    } catch (error) {
      console.warn(
        '[storage] Supabase upload failed, falling back to local disk.',
        error,
      );
    }
  }

  return uploadDocumentFileToLocalDisk(buffer, storagePath);
}

async function uploadDocumentFileToLocalDisk(
  buffer: Buffer,
  storagePath: string,
): Promise<UploadedFile> {
  const absolutePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    env.LOCAL_STORAGE_DIR,
    storagePath,
  );

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    storagePath: `local/${storagePath}`,
    byteSize: buffer.length,
  };
}
