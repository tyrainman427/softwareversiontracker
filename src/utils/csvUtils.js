import Papa from 'papaparse';

const REQUIRED_COLUMNS = ['Software Name', 'Version Number'];

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (val) => val.trim(),
      complete(results) {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          return;
        }
        const headers = results.meta.fields || [];
        const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        if (missing.length > 0) {
          reject(new Error(`Missing required columns: ${missing.join(', ')}. Your CSV must include: ${REQUIRED_COLUMNS.join(', ')}`));
          return;
        }
        resolve(results.data);
      },
      error(err) {
        reject(new Error(`Failed to read CSV: ${err.message}`));
      },
    });
  });
}

export function exportOutdatedCSV(results) {
  const outdated = results.filter(r => r._status === 'Outdated');
  if (outdated.length === 0) return;

  const exportData = outdated.map(r => ({
    'Software Name': r['Software Name'],
    'Version Number': r['Version Number'],
    'Latest Version': r._latestVersion || '',
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `outdated-software-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
