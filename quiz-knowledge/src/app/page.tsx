import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Quiz Knowledge - Create & Take AI-Powered Quizzes',
  description: 'Generate interactive quizzes from your documents using AI-powered analysis.',
};

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-3xl font-bold text-center">Welcome to Quiz Knowledge</h1>
      <p className="text-gray-600 text-center max-w-md">
        Create and take interactive quizzes from your documents using AI.
      </p>
      <Link href="/manager/new">
        <Button>Get Started</Button>
      </Link>
    </div>
  );
}
