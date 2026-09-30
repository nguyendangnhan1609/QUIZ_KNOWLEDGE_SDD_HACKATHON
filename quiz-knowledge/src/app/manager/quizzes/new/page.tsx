import { prisma } from '@/lib/db/prisma';
import { GenerateForm } from './_components/GenerateForm';
import { MultiDocumentSummary } from './_components/MultiDocumentSummary';

interface PageProps {
  searchParams: Promise<{ documentId?: string; documentIds?: string }>;
}

export const metadata = {
  title: 'Generate Quiz - Quiz Knowledge',
  description: 'Configure and generate a quiz from your document.',
};

export default async function GenerateQuizPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Prefer documentIds (multi-upload) over documentId (single, legacy)
  let documentIds: number[] = [];
  if (params.documentIds) {
    documentIds = params.documentIds
      .split(',')
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n));
  } else if (params.documentId) {
    const id = parseInt(params.documentId, 10);
    if (!isNaN(id)) documentIds = [id];
  }

  if (documentIds.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Document required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please upload a document first.
          </p>
          <a href="/manager/new" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to upload
          </a>
        </div>
      </div>
    );
  }

  const docs = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, filename: true, charCount: true },
    orderBy: { id: 'asc' },
  });

  if (docs.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Document not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The document you&apos;re looking for doesn&apos;t exist.
          </p>
          <a href="/manager/new" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to upload
          </a>
        </div>
      </div>
    );
  }

  // Single document: existing layout unchanged
  if (docs.length === 1) {
    const doc = docs[0];
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Generate quiz</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              From <strong>{doc.filename}</strong> ({doc.charCount.toLocaleString()} characters)
            </p>
          </div>
          <GenerateForm documentIds={[doc.id]} />
        </div>
      </div>
    );
  }

  // Multiple documents: generate from all combined
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Generate quiz</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a document and configure your quiz.
          </p>
        </div>
        <MultiDocumentSummary documents={docs} />
      </div>
    </div>
  );
}
