import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { Button } from 'react-native-paper';

interface ScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const ScannerView: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'qr', 'code-128', 'upc-a'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        onScan(codes[0].value);
      }
    },
  });

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Camera permission is required to scan barcodes.</Text>
        <Button mode="contained" onPress={onClose} style={styles.btn}>
          Go Back
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No back camera device found on this phone.</Text>
        <Button mode="contained" onPress={onClose} style={styles.btn}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <View style={styles.finder} />
        <Text style={styles.overlayText}>Center the barcode within the box</Text>
        <Button mode="contained" onPress={onClose} buttonColor="rgba(255, 0, 0, 0.7)" style={styles.closeBtn}>
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
