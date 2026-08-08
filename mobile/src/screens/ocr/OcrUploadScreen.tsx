import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, Alert, TouchableOpacity } from 'react-native';
import { Button, Card, Title, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/apiClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface OcrItem {
  medicineName: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  batchNumber?: string;
  expiryDate?: string;
}

export const OcrUploadScreen: React.FC = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [parsedItems, setParsedItems] = useState<OcrItem[]>([]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to capture invoices.');
      return false;
    }
    return true;
  };

  const handleCapture = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setFileData({
        uri: asset.uri,
        type: asset.type === 'image' ? 'image/jpeg' : (asset.mimeType || 'image/jpeg'),
        name: asset.fileName || 'invoice.jpg',
      });
      setParsedItems([]);
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed to pick invoices.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setFileData({
        uri: asset.uri,
        type: asset.type === 'image' ? 'image/jpeg' : (asset.mimeType || 'image/jpeg'),
        name: asset.fileName || 'invoice.jpg',
      });
      setParsedItems([]);
    }
  };

  const handleOcrProcess = async () => {
    if (!fileData) {
      Alert.alert('No Image', 'Please capture or select an invoice image first.');
      return;
    }

    setLoading(true);
    setStatusMessage('Uploading invoice to AI parser...');
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileData.uri,
        type: fileData.type,
        name: fileData.name,
      } as any);

      // 1. Upload Invoice File
      const uploadRes = await apiClient.post('/invoice/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadRes.data && uploadRes.data.jobId) {
        const { jobId } = uploadRes.data;
        setStatusMessage('AI engine parsing medicines (this takes a moment)...');
        
        // 2. Poll result status
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const resultRes = await apiClient.get(`/invoice/result/${jobId}`);
            if (resultRes.data && resultRes.data.status === 'Completed') {
              clearInterval(pollInterval);
              setLoading(false);
              setStatusMessage('');
              const medicinesList = resultRes.data.result?.medicines || [];
              setParsedItems(medicinesList);
              Alert.alert('Analysis Complete', `Parsed ${medicinesList.length} items from supplier invoice.`);
            } else if (resultRes.data && resultRes.data.status === 'Failed') {
              clearInterval(pollInterval);
              setLoading(false);
              setStatusMessage('');
              Alert.alert('Parse Failed', 'AI OCR engine was unable to read this invoice style.');
            } else if (attempts > 10) {
              clearInterval(pollInterval);
              setLoading(false);
              setStatusMessage('');
              Alert.alert('Timeout', 'OCR process took too long. Try again.');
            }
          } catch (pollErr) {
            clearInterval(pollInterval);
            setLoading(false);
            setStatusMessage('');
            Alert.alert('Error', 'Failed to retrieve parser logs.');
          }
        }, 3000);
      }
    } catch (err: any) {
      setLoading(false);
      setStatusMessage('');
      Alert.alert('Upload Error', err.response?.data?.message || 'Failed to submit file to OCR gateway.');
    }
  };

  const handleConfirmPurchase = async () => {
    if (parsedItems.length === 0) return;
    setLoading(true);
    try {
      await apiClient.post('/invoice/confirm', {
        items: parsedItems,
        invoiceNumber: `OCR-${Date.now().toString().slice(-6)}`,
        supplierName: 'OCR Supplier',
      });
      Alert.alert('Success', 'Inventory updated successfully!');
      setParsedItems([]);
      setImageUri(null);
      setFileData(null);
    } catch (err) {
      Alert.alert('Failed', 'Failed to confirm purchase entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>AI Invoice OCR scanner</Title>
        <Text style={styles.subtitle}>Upload supplier invoices to automatically import new stock</Text>
      </View>

      {/* Image Preview / Box */}
      <View style={styles.imageBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholder}>
            <MaterialCommunityIcons name="cloud-upload" size={64} color="#333" />
            <Text style={styles.placeText}>No invoice selected</Text>
          </View>
        )}
      </View>

      {/* Photo Picker Options */}
      <View style={styles.btnRow}>
        <Button mode="contained-tonal" icon="camera" style={styles.pickerBtn} onPress={handleCapture} disabled={loading}>
          Camera
        </Button>
        <Button mode="contained-tonal" icon="image-multiple" style={styles.pickerBtn} onPress={handleGallery} disabled={loading}>
          Gallery
        </Button>
      </View>

      {/* Action triggers */}
      {imageUri && parsedItems.length === 0 && (
        <Button
          mode="contained"
          onPress={handleOcrProcess}
          loading={loading}
          disabled={loading}
          style={styles.processBtn}
          buttonColor="#bb86fc"
          textColor="#000"
        >
          {loading ? statusMessage : 'Process with AI OCR'}
        </Button>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#bb86fc" />
          <Text style={styles.loadingText}>{statusMessage}</Text>
        </View>
      )}

      {/* Parsed Result Preview */}
      {parsedItems.length > 0 && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultHeader}>OCR Preview ({parsedItems.length} items)</Text>
          {parsedItems.map((item, idx) => (
            <Card key={idx} style={styles.resultCard}>
              <Card.Content>
                <Title style={styles.itemTitle}>{item.medicineName}</Title>
                <View style={styles.row}>
                  <Text style={styles.cell}>Qty: <Text style={styles.bold}>{item.quantity}</Text></Text>
                  <Text style={styles.cell}>Rate: <Text style={styles.bold}>₹{item.rate}</Text></Text>
                  <Text style={styles.cell}>GST: <Text style={styles.bold}>{item.gstPercent}%</Text></Text>
                </View>
                {item.batchNumber && (
                  <Text style={styles.itemBatch}>Batch: {item.batchNumber} | Expiry: {item.expiryDate || 'N/A'}</Text>
                )}
              </Card.Content>
            </Card>
          ))}

          <Button
            mode="contained"
            onPress={handleConfirmPurchase}
            style={styles.processBtn}
            buttonColor="#4ade80"
            textColor="#000"
            icon="check-circle"
          >
            Confirm & Save to Stock
          </Button>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  imageBox: {
    width: '100%',
    height: 250,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 20,
  },
  pickerBtn: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 8,
  },
  processBtn: {
    borderRadius: 10,
    paddingVertical: 6,
    marginVertical: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 8,
  },
  resultContainer: {
    marginTop: 10,
  },
  resultHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#bb86fc',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#1e1e1e',
    marginBottom: 10,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  cell: {
    flex: 1,
    fontSize: 12,
    color: '#aaa',
  },
  bold: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemBatch: {
    fontSize: 11,
    color: '#888',
    marginTop: 6,
  },
});

export default OcrUploadScreen;
