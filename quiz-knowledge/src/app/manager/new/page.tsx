import { UploadForm } from './_components/UploadForm';

export const metadata = {
  title: 'Upload Document',
};

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Upload a Document
            </h1>
            <p className="mt-2 text-gray-600">
              Upload a PDF, DOCX, or Markdown file to generate a quiz.
            </p>
          </div>

          <UploadForm />
        </div>
      </div>
    </div>
  );
}
