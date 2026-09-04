import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, CameraType, BarCodeScanningResult } from 'expo-camera';
import { Button } from 'react-native-paper';

interface ScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const ScannerView: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const scannedRef = useRef(false);

  useEffect(() => {
    scannedRef.current = false;
  }, []);

  const handleBarCodeScanned = ({ data }: BarCodeScanningResult) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScan(data);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Camera permission is required to scan barcodes.</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.btn}>
          Grant Permission
        </Button>
        <Button mode="outlined" onPress={onClose} style={[styles.btn, { marginTop: 12 }]} textColor="#bb86fc">
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        type={CameraType.back}
        barCodeScannerSettings={{
          barCodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'upc_a'],
        }}
        onBarCodeScanned={handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.finder} />
        <Text style={styles.overlayText}>Center the barcode within the box</Text>
        <Button
          mode="contained"
          onPress={onClose}
          buttonColor="rgba(255, 0, 0, 0.7)"
          style={styles.closeBtn}
        >
          Cancel Scan
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  text: {
    marginTop: 10,
    color: '#aaa',
  },
  error: {
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  btn: {
    borderRadius: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  finder: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: '#03dac6',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  overlayText: {
    color: 'white',
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeBtn: {
    marginTop: 40,
    borderRadius: 8,
  },
});

export default ScannerView;
