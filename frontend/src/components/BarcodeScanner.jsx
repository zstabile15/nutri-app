import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);

  const handleClose = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    onClose();
  };

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
        console.error('BarcodeScanner error:', err);
        if (!window.isSecureContext) {
          setError('Camera requires a secure connection (HTTPS). Please access this app over HTTPS.');
        } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Please allow camera access in your browser settings and try again.');
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          setError('No camera found on this device.');
        } else if (err?.name === 'NotReadableError') {
          setError('Camera is already in use by another application.');
        } else {
          setError(`Camera unavailable: ${err?.message || err}`);
        }
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
        <button className="btn btn-icon btn-ghost" onClick={handleClose}>
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
