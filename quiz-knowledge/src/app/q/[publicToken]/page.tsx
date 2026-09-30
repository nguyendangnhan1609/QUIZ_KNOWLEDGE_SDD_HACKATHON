import { QuizLauncher } from './_components/QuizLauncher';

export const metadata = {
  title: 'Take Quiz - Quiz Knowledge',
  description: 'Answer quiz questions and test your knowledge.',
};

export default async function QuizPage({ params }: { params: Promise<{ publicToken: string }> }) {
  const { publicToken } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <QuizLauncher publicToken={publicToken} />
    </div>
  );
}
