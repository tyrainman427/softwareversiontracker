import { useState, useMemo } from 'react';
import SoftwareRow from './SoftwareRow';
import { exportOutdatedCSV } from '../utils/csvUtils';

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const expDate = new Date(dateStr);
  if (isNaN(expDate)) return false;
  const now = new Date();
  const diffDays = (expDate - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

const FILTERS = ['All', 'Outdated', 'Up to Date', 'Unknown', 'Expiring Soon'];

export default function ResultsDashboard({ results, onReset }) {
  const [filter, setFilter] = useState('All');

  const columns = useMemo(() => {
    if (results.length === 0) return [];
    const hidden = ['Department/Team', 'Free', 'Ticket', 'Approver', 'Approval Expiration', 'Additional Notes'];
    return Object.keys(results[0]).filter(k => !k.startsWith('_') && !hidden.includes(k));
  }, [results]);

  const counts = useMemo(() => ({
    total: results.length,
    outdated: results.filter(r => r._status === 'Outdated').length,
    upToDate: results.filter(r => r._status === 'Up to Date').length,
    unknown: results.filter(r => r._status === 'Unknown').length,
    expiring: results.filter(r => isExpiringSoon(r['Approval Expiration'])).length,
  }), [results]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Outdated': return results.filter(r => r._status === 'Outdated');
      case 'Up to Date': return results.filter(r => r._status === 'Up to Date');
      case 'Unknown': return results.filter(r => r._status === 'Unknown');
      case 'Expiring Soon': return results.filter(r => isExpiringSoon(r['Approval Expiration']));
      default: return results;
    }
  }, [results, filter]);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Scan Results</h2>
        <div className="flex gap-3">
          <button
            onClick={() => exportOutdatedCSV(results)}
            disabled={counts.outdated === 0}
            className="px-5 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Export Outdated ({counts.outdated})
          </button>
          <button
            onClick={onReset}
            className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            New Scan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: counts.total, color: 'bg-gray-100 text-gray-800' },
          { label: 'Outdated', value: counts.outdated, color: 'bg-red-100 text-red-800' },
          { label: 'Up to Date', value: counts.upToDate, color: 'bg-green-100 text-green-800' },
          { label: 'Unknown', value: counts.unknown, color: 'bg-yellow-100 text-yellow-800' },
          { label: 'Expiring Soon', value: counts.expiring, color: 'bg-orange-100 text-orange-800' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-lg p-4 ${color}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No results matching "{filter}"
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Latest Version
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((row, i) => (
                <SoftwareRow key={i} row={row} columns={columns} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
