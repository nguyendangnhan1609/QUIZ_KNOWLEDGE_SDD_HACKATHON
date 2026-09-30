'use client';

import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string[];
  maxSize?: number;
  disabled?: boolean;
  isLoading?: boolean;
}

export function FileDropzone({
  onFiles,
  multiple = false,
  accept = ['application/pdf', 'text/markdown'],
  maxSize = 15 * 1024 * 1024,
  disabled = false,
  isLoading = false,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `"${file.name}" is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB.`;
    }

    const name = file.name.toLowerCase();
    const textExtensions = ['.md', '.txt', '.csv', '.html', '.htm'];
    const isAccepted =
      accept.includes(file.type) || textExtensions.some((ext) => name.endsWith(ext));
    if (!isAccepted) {
      return `"${file.name}" is not a supported file type.`;
    }

    return null;
  };

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const validFiles: File[] = [];
      const newErrors: string[] = [];

      for (const file of files) {
        const err = validateFile(file);
        if (err) {
          newErrors.push(err);
        } else {
          validFiles.push(file);
        }
      }

      setErrors(newErrors);

      if (validFiles.length === 0) return;

      // In single mode only pass the first valid file
      onFiles(multiple ? validFiles : [validFiles[0]]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onFiles, accept, maxSize, multiple],
  );

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        // reset so the same file can be re-selected
        e.target.value = '';
      }
    },
    [processFiles],
  );

  return (
    <div
      onDragOver={handleDrag}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 transition-colors',
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50',
        (disabled || isLoading) && 'opacity-60 pointer-events-none',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        onChange={handleInputChange}
        disabled={disabled || isLoading}
        className="hidden"
        accept={accept.join(',')}
        multiple={multiple}
      />

      {isLoading ? (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
          <p className="text-sm font-medium text-gray-600">Uploading...</p>
        </>
      ) : (
        <>
          <svg
            className="h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <div className="text-center">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-medium text-blue-600 hover:text-blue-700 underline"
            >
              {multiple ? 'Click to upload files' : 'Click to upload'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              {multiple ? 'or drag and drop multiple files' : 'or drag and drop'}
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            PDF, DOCX, MD, TXT, CSV, HTML up to {(maxSize / 1024 / 1024).toFixed(0)}MB
            {multiple ? ' each' : ''}
          </p>
        </>
      )}

      {errors.length > 0 && (
        <ul className="w-full space-y-1">
          {errors.map((err, i) => (
            <li key={i} className="text-sm text-red-600 text-center">
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
