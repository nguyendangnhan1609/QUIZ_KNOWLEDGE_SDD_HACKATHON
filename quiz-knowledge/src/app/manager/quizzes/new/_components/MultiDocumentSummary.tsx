'use client';

import { GenerateForm } from './GenerateForm';

interface Doc {
  id: number;
  filename: string;
  charCount: number;
}

interface MultiDocumentSummaryProps {
  documents: Doc[];
}

export function MultiDocumentSummary({ documents }: MultiDocumentSummaryProps) {
  const totalChars = documents.reduce((sum, d) => sum + d.charCount, 0);
  const documentIds = documents.map(d => d.id);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          Sources ({documents.length} document{documents.length > 1 ? 's' : ''})
        </p>
        <ul className="space-y-2">
          {documents.map(doc => (
            <li
              key={doc.id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <p className="text-sm font-medium text-gray-800">{doc.filename}</p>
              <p className="text-xs text-gray-400">
                {doc.charCount.toLocaleString()} characters
              </p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500">
          Combined: {totalChars.toLocaleString()} characters
        </p>
      </div>

      <GenerateForm documentIds={documentIds} />
    </div>
  );
}
