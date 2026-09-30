'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileDropzone } from '@/components/shared/FileDropzone';
import { ACCEPTED_MIMES, MAX_FILE_SIZE } from '@/lib/schemas/upload';

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';

interface FileEntry {
  file: File;
  status: FileStatus;
  documentId?: number;
  errorMessage?: string;
}

interface UploadResult {
  success: boolean;
  documentId?: number;
}

const apiErrorMessages: Record<string, string> = {
  INVALID_INPUT: 'Invalid upload. Please try again.',
  FILE_TOO_LARGE: 'File too large (max 15MB).',
  UNSUPPORTED_MIME: 'Unsupported file type.',
  PARSE_FAILED: "We couldn't read this file.",
  PARSE_EMPTY: 'No readable text. Is this a scanned PDF?',
  STORAGE_FAILED: 'Upload failed. Please try again.',
  INTERNAL: 'Something went wrong.',
};

const statusColors: Record<FileStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  uploading: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
};

const statusLabels: Record<FileStatus, string> = {
  pending: 'Pending',
  uploading: 'Uploading…',
  done: 'Done',
  error: 'Error',
};

export function UploadForm() {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onFilesSelected = (files: File[]) => {
    setEntries(prev => {
      const existingNames = new Set(prev.map(e => e.file.name));
      const newEntries = files
        .filter(f => !existingNames.has(f.name))
        .map(f => ({ file: f, status: 'pending' as FileStatus }));
      return [...prev, ...newEntries];
    });
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, patch: Partial<FileEntry>) => {
    setEntries(prev => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Snapshot pending entries with their indices at submit time
    const pending = entries
      .map((entry, i) => ({ entry, i }))
      .filter(({ entry }) => entry.status === 'pending');

    if (pending.length === 0) return;
    setIsUploading(true);

    const results: UploadResult[] = [];

    for (const { entry, i } of pending) {
      updateEntry(i, { status: 'uploading' });

      try {
        const formData = new FormData();
        formData.append('file', entry.file);

        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          const code: string = json.error?.code ?? 'INTERNAL';
          const message =
            apiErrorMessages[code] ?? json.error?.message ?? apiErrorMessages.INTERNAL;
          updateEntry(i, { status: 'error', errorMessage: message });
          results.push({ success: false });
        } else {
          updateEntry(i, { status: 'done', documentId: json.data?.documentId });
          results.push({ success: true, documentId: json.data?.documentId });
        }
      } catch {
        updateEntry(i, { status: 'error', errorMessage: 'Network error. Please try again.' });
        results.push({ success: false });
      }
    }

    setIsUploading(false);

    const succeeded = results.filter((r): r is UploadResult & { documentId: number } =>
      r.success && r.documentId != null,
    );
    const total = pending.length;

    if (succeeded.length > 0) {
      toast.success(
        `${succeeded.length} of ${total} document${total > 1 ? 's' : ''} uploaded.`,
      );
      const ids = succeeded.map(r => r.documentId);
      if (ids.length === 1) {
        router.push(`/manager/quizzes/new?documentId=${ids[0]}`);
      } else {
        router.push(`/manager/quizzes/new?documentIds=${ids.join(',')}`);
      }
    } else {
      toast.error('All uploads failed. Please check the errors below.');
    }
  };

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const isAnyUploading = entries.some(e => e.status === 'uploading');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FileDropzone
        onFiles={onFilesSelected}
        multiple
        accept={Array.from(ACCEPTED_MIMES)}
        maxSize={MAX_FILE_SIZE}
        isLoading={isAnyUploading}
        disabled={isAnyUploading}
      />

      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry, i) => (
            <li
              key={`${entry.file.name}-${i}`}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {entry.file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(entry.file.size / 1024).toFixed(0)} KB
                </p>
                {entry.status === 'error' && entry.errorMessage && (
                  <p className="mt-0.5 text-xs text-red-600">{entry.errorMessage}</p>
                )}
              </div>

              <div className="ml-3 flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[entry.status]}`}
                >
                  {statusLabels[entry.status]}
                </span>
                {entry.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => removeEntry(i)}
                    aria-label={`Remove ${entry.file.name}`}
                    className="text-sm leading-none text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={pendingCount === 0 || isUploading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAnyUploading
          ? 'Uploading…'
          : pendingCount > 0
            ? `Upload ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
            : 'Upload Document'}
      </button>
    </form>
  );
}
