import StatusBadge from './StatusBadge';

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const expDate = new Date(dateStr);
  if (isNaN(expDate)) return false;
  const now = new Date();
  const diffDays = (expDate - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

export default function SoftwareRow({ row, columns }) {
  const expiring = isExpiringSoon(row['Approval Expiration']);

  return (
    <tr className={expiring ? 'border-l-4 border-orange-400' : ''}>
      {columns.map((col) => (
        <td key={col} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
          {row[col]}
        </td>
      ))}
      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
        {row._latestVersion || '—'}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        <StatusBadge status={row._status || 'Unknown'} />
      </td>
      <td className="px-4 py-2 text-sm whitespace-nowrap">
        {row._source ? (
          <a href={row._source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-48">
            {row._source}
          </a>
        ) : '—'}
      </td>
      {expiring && (
        <td className="px-4 py-2 text-xs font-medium text-orange-600 whitespace-nowrap">
          Expiring Soon
        </td>
      )}
    </tr>
  );
}
