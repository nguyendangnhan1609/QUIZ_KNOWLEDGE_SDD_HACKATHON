import { Sparkles, FileText } from 'lucide-react';
import Link from 'next/link';

export function EmptyGenerationState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-purple-100 rounded-full">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Documents to Generate From</h2>
        <p className="text-slate-600 mb-6">
          Upload a document first to generate quizzes using AI-powered analysis.
        </p>
        <Link
          href="/manager/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
        >
          <FileText className="w-4 h-4" />
          Upload First Document
        </Link>
      </div>
    </div>
  );
}
