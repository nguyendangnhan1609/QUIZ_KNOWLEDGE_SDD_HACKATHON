import { Upload, FileText } from 'lucide-react';
import Link from 'next/link';

export function EmptyUploadState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 rounded-full">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Documents Yet</h2>
        <p className="text-slate-600 mb-6">
          Upload a document to get started. Supported formats: PDF, DOCX, TXT.
        </p>
        <Link
          href="/manager/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Link>
      </div>
    </div>
  );
}
