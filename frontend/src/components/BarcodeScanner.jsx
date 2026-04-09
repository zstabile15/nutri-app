import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let scanner = null;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {} // ignore scan failures
        );
      } catch (err) {
        setError('Camera access denied or unavailable. Please check permissions.');
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="flex-col gap-md">
      <div className="flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} />
          <span style={{ fontWeight: 600 }}>Scan Barcode</span>
        </div>
        <button className="btn btn-icon btn-ghost" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {error ? (
        <div className="auth-error">{error}</div>
      ) : (
        <div className="scanner-view">
          <div id="barcode-reader" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}
