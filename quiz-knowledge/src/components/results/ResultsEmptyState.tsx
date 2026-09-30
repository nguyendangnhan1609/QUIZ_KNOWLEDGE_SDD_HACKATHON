export function ResultsEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
      <div className="space-y-3">
        <p className="text-lg font-medium text-slate-900">No submissions yet</p>
        <p className="text-sm text-slate-600">
          Share the quiz link with participants and check back once they've completed it.
        </p>
      </div>
    </div>
  );
}
