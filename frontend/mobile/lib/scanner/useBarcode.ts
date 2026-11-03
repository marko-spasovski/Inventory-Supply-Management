// Barcode/QR scanner helper: camera permission + a one-shot scan callback.
import { useState, useCallback, useRef } from 'react';
import { useCameraPermissions } from 'expo-camera';

export interface BarcodeScanResult {
  type: string;
  data: string;
}

export function useBarcode(onScanned: (result: BarcodeScanResult) => void) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  // CameraView fires onBarcodeScanned many times per second. `scanned` (state)
  // updates asynchronously, so guarding only on it lets several scans through
  // before the next render — which previously fired the callback (and its
  // navigation) repeatedly. A ref flips synchronously on the first scan, so the
  // callback runs exactly once until reset.
  const handledRef = useRef(false);

  const handleScan = useCallback(
    (result: BarcodeScanResult) => {
      if (handledRef.current) return;
      handledRef.current = true;
      setScanned(true);
      onScanned(result);
    },
    [onScanned],
  );

  const reset = useCallback(() => {
    handledRef.current = false;
    setScanned(false);
  }, []);

  return {
    hasPermission: permission?.granted ?? false,
    canAskPermission: permission?.canAskAgain ?? true,
    requestPermission,
    scanned,
    handleScan,
    reset,
  };
}
