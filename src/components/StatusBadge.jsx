const STATUS_STYLES = {
  Outdated: 'bg-red-100 text-red-800',
  'Up to Date': 'bg-green-100 text-green-800',
  Unknown: 'bg-yellow-100 text-yellow-800',
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Unknown;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}
