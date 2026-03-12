export default function ScanProgress({ progress, total, currentItem, onCancel }) {
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Scanning Software Versions</h2>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress: {progress} / {total}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-gray-600 mb-6">
        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="text-sm">Checking: <strong>{currentItem}</strong></span>
      </div>

      <button
        onClick={onCancel}
        className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
