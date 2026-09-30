import { LoadingState } from '@/components/shared/LoadingState';

export default function QuizLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <LoadingState variant="quiz" />
    </div>
  );
}
