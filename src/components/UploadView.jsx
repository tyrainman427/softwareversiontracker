import { useState, useCallback } from 'react';
import { parseCSV } from '../utils/csvUtils';


export default function UploadView({ onDataParsed }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback(async (file) => {
    setError(null);
    setPreview(null);
    setFileName(file.name);
    try {
      const data = await parseCSV(file);
      setPreview(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const hidden = ['Department/Team', 'Free', 'Ticket'];
  const columns = preview?.length > 0 ? Object.keys(preview[0]).filter(k => !hidden.includes(k)) : [];

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Software Version Tracker</h1>
      <p className="text-gray-500 mb-8">Upload a CSV of your software inventory to check for outdated versions.</p>

      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => document.getElementById('csv-input').click()}
      >
        <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={onFileInput} />
        <div className="text-gray-400 text-5xl mb-4">+</div>
        <p className="text-gray-600 font-medium">
          {fileName || 'Drop a CSV file here, or click to browse'}
        </p>
        <p className="text-gray-400 text-sm mt-1">Requires columns: Software Name, Version Number</p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {preview && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Preview ({preview.length} rows)
            </h2>
            <button
              disabled={false}
              onClick={() => onDataParsed(preview)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Start Scan
            </button>
          </div>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="text-sm text-gray-400 text-center py-2">
                Showing 10 of {preview.length} rows
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
