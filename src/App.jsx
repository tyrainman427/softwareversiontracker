import { useState, useEffect } from 'react';
import UploadView from './components/UploadView';
import ScanProgress from './components/ScanProgress';
import ResultsDashboard from './components/ResultsDashboard';
import { useScanner } from './hooks/useScanner';

export default function App() {
  const [view, setView] = useState('upload');
  const [parsedData, setParsedData] = useState(null);
  const scanner = useScanner(parsedData);

  const handleDataParsed = (data) => {
    setParsedData(data);
    setView('scanning');
  };

  useEffect(() => {
    if (view === 'scanning' && parsedData && !scanner.isScanning && scanner.progress === 0) {
      scanner.start();
    }
  }, [view, parsedData]);

  useEffect(() => {
    if (!scanner.isScanning && scanner.progress > 0) {
      setView('results');
    }
  }, [scanner.isScanning, scanner.progress]);

  const handleReset = () => {
    scanner.reset();
    setParsedData(null);
    setView('upload');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'upload' && <UploadView onDataParsed={handleDataParsed} />}
      {view === 'scanning' && (
        <ScanProgress
          progress={scanner.progress}
          total={scanner.total}
          currentItem={scanner.currentItem}
          onCancel={() => { scanner.cancel(); setView('results'); }}
        />
      )}
      {view === 'results' && (
        <ResultsDashboard results={scanner.results} onReset={handleReset} />
      )}
    </div>
  );
}
