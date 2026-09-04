import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Button, Card, Title, ActivityIndicator, TextInput, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/apiClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface OcrItem {
  name: string;
  medicineName?: string;
  strength?: string;
  category?: string;
  genericName?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  freeQuantity?: number;
  purchaseRate: number;
  mrp: number;
  gstPercent: number;
  matchedMedicineId?: string | null;
  matchedMedicineName?: string | null;
}

interface OcrSupplier {
  name: string;
  gstNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface OcrInvoice {
  invoiceNumber: string;
  invoiceDate: string;
}

interface OcrTotals {
  subTotal: number;
  gstTotal: number;
  totalAmount: number;
}

interface OcrParsedData {
  supplier: OcrSupplier;
  invoice: OcrInvoice;
  items: OcrItem[];
  totals: OcrTotals;
  warnings?: string[];
}

export const OcrUploadScreen: React.FC = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // OCR Workbench State
  const [parsedResult, setParsedResult] = useState<OcrParsedData | null>(null);
  const [dbMedicines, setDbMedicines] = useState<any[]>([]);
  const [remarks, setRemarks] = useState('');

  // Medicine Matching Modal State
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [currentEditingItemIdx, setCurrentEditingItemIdx] = useState<number | null>(null);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');

  // Fetch medicines database on mount for matching
  const fetchDbMedicines = async () => {
    try {
      const res = await apiClient.get('/medicines');
      if (res.data) {
        setDbMedicines(res.data);
      }
    } catch (e) {
      console.error('Failed to load medicines database', e);
    }
  };

  useEffect(() => {
    fetchDbMedicines();
  }, []);

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
      setParsedResult(null);
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
      setParsedResult(null);
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
      // Backend expects 'invoice' field name for multipart
      formData.append('invoice', {
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
            if (resultRes.data && resultRes.data.status === 'Success') {
              clearInterval(pollInterval);
              setLoading(false);
              setStatusMessage('');
              // Backend returns data inside parsedData
              const rawParsed = resultRes.data.parsedData;
              if (rawParsed) {
                // Ensure items match correctly
                const itemsMapped = (rawParsed.items || []).map((it: any) => ({
                  ...it,
                  name: it.name || it.medicineName || '',
                  quantity: parseFloat(it.quantity) || 0,
                  freeQuantity: parseFloat(it.freeQuantity) || 0,
                  purchaseRate: parseFloat(it.purchaseRate || it.rate) || 0,
                  mrp: parseFloat(it.mrp) || 0,
                  gstPercent: parseFloat(it.gstPercent) || 0,
                  matchedMedicineId: it.matchedMedicineId || null,
                  matchedMedicineName: it.matchedMedicineName || null,
                }));
                setParsedResult({
                  ...rawParsed,
                  items: itemsMapped,
                });
                Alert.alert('Analysis Complete', `Parsed ${itemsMapped.length} items from supplier invoice.`);
              }
            } else if (resultRes.data && resultRes.data.status === 'Failed') {
              clearInterval(pollInterval);
              setLoading(false);
              setStatusMessage('');
              Alert.alert('Parse Failed', 'AI OCR engine was unable to read this invoice style.');
            } else if (attempts > 12) {
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
        }, 2000);
      }
    } catch (err: any) {
      setLoading(false);
      setStatusMessage('');
      Alert.alert('Upload Error', err.response?.data?.message || 'Failed to submit file to OCR gateway.');
    }
  };

  const handleUpdateItemValue = (idx: number, key: keyof OcrItem, val: string) => {
    if (!parsedResult) return;
    const updatedItems = [...parsedResult.items];
    const item = { ...updatedItems[idx] };

    if (key === 'quantity' || key === 'freeQuantity' || key === 'purchaseRate' || key === 'mrp' || key === 'gstPercent') {
      const parsedNum = parseFloat(val) || 0;
      (item as any)[key] = parsedNum;
    } else {
      (item as any)[key] = val;
    }

    updatedItems[idx] = item;
    recalculateTotals(updatedItems);
  };

  const recalculateTotals = (items: OcrItem[]) => {
    if (!parsedResult) return;
    let subTotal = 0;
    let gstTotal = 0;

    items.forEach((item) => {
      const itemSub = item.quantity * item.purchaseRate;
      const itemGst = itemSub * (item.gstPercent / 100);
      subTotal += itemSub;
      gstTotal += itemGst;
    });

    setParsedResult({
      ...parsedResult,
      items,
      totals: {
        subTotal: Math.round(subTotal * 100) / 100,
        gstTotal: Math.round(gstTotal * 100) / 100,
        totalAmount: Math.round((subTotal + gstTotal) * 100) / 100,
      },
    });
  };

  const openMatchModal = (idx: number) => {
    setCurrentEditingItemIdx(idx);
    setMatchSearchQuery('');
    setIsMatchModalOpen(true);
  };

  const selectMedicineMatch = (medicineId: string | null, medicineName: string | null) => {
    if (currentEditingItemIdx === null || !parsedResult) return;
    const updatedItems = [...parsedResult.items];
    updatedItems[currentEditingItemIdx] = {
      ...updatedItems[currentEditingItemIdx],
      matchedMedicineId: medicineId,
      matchedMedicineName: medicineName,
    };
    setParsedResult({
      ...parsedResult,
      items: updatedItems,
    });
    setIsMatchModalOpen(false);
    setCurrentEditingItemIdx(null);
  };

  const handleConfirmPurchase = async () => {
    if (!parsedResult) return;
    setLoading(true);
    try {
      const payload = {
        supplier: parsedResult.supplier,
        invoice: parsedResult.invoice,
        items: parsedResult.items,
        remarks: remarks || 'Imported via mobile AI OCR scanner',
      };

      await apiClient.post('/invoice/confirm', payload);
      Alert.alert('Success', 'Inventory stock imported successfully!');
      setParsedResult(null);
      setImageUri(null);
      setFileData(null);
      setRemarks('');
    } catch (err: any) {
      Alert.alert('Import Failed', err.response?.data?.message || 'Failed to confirm purchase entry.');
    } finally {
      setLoading(false);
    }
  };

  const resetParser = () => {
    setParsedResult(null);
    setImageUri(null);
    setFileData(null);
    setRemarks('');
  };

  // Filter medicines for matching select
  const filteredDbMedicines = dbMedicines.filter((med) => {
    const query = matchSearchQuery.toLowerCase();
    return (
      med.name.toLowerCase().includes(query) ||
      (med.genericName && med.genericName.toLowerCase().includes(query)) ||
      (med.code && med.code.toLowerCase().includes(query))
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#060912' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Title style={styles.title}>AI Invoice OCR scanner</Title>
          <Text style={styles.subtitle}>Upload supplier invoices to automatically import new stock</Text>
        </View>

        {/* Upload Screen View (if no parsed result exists yet) */}
        {!parsedResult && !loading && (
          <View>
            {/* Image Preview / Box */}
            <View style={styles.imageBox}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholder}>
                  <MaterialCommunityIcons name="cloud-upload" size={64} color="#475569" />
                  <Text style={styles.placeText}>No invoice selected</Text>
                </View>
              )}
            </View>

            {/* Photo Picker Options */}
            <View style={styles.btnRow}>
              <Button mode="contained-tonal" icon="camera" style={styles.pickerBtn} onPress={handleCapture} buttonColor="#1e293b" textColor="#f8fafc">
                Camera
              </Button>
              <Button mode="contained-tonal" icon="image-multiple" style={styles.pickerBtn} onPress={handleGallery} buttonColor="#1e293b" textColor="#f8fafc">
                Gallery
              </Button>
            </View>

            {imageUri && (
              <Button
                mode="contained"
                onPress={handleOcrProcess}
                style={styles.processBtn}
                buttonColor="#3b82f6"
                textColor="#fff"
                icon="robot"
              >
                Process with AI OCR
              </Button>
            )}
          </View>
        )}

        {/* Processing Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginBottom: 16 }} />
            <Text style={styles.loadingText}>{statusMessage}</Text>
          </View>
        )}

        {/* Edit / Review Workbench UI */}
        {parsedResult && !loading && (
          <View style={styles.workbench}>
            <View style={styles.workbenchHeader}>
              <Text style={styles.workbenchTitle}>Scan Review Workbench</Text>
              <Button mode="outlined" compact onPress={resetParser} textColor="#ef4444" style={{ borderColor: '#ef4444' }}>
                Cancel
              </Button>
            </View>

            {/* Warnings from Gemini */}
            {parsedResult.warnings && parsedResult.warnings.length > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ AI Scan Notices</Text>
                {parsedResult.warnings.map((warn, idx) => (
                  <Text key={idx} style={styles.warningText}>• {warn}</Text>
                ))}
              </View>
            )}

            {/* Supplier Details Card */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardHeader}>Supplier Details</Text>
                <TextInput
                  label="Supplier Name"
                  mode="outlined"
                  value={parsedResult.supplier.name}
                  onChangeText={(val) => setParsedResult({
                    ...parsedResult,
                    supplier: { ...parsedResult.supplier, name: val }
                  })}
                  style={styles.input}
                  activeOutlineColor="#3b82f6"
                  outlineColor="#1e293b"
                  textColor="#fff"
                />
                <TextInput
                  label="Supplier GSTIN"
                  mode="outlined"
                  value={parsedResult.supplier.gstNumber || ''}
                  onChangeText={(val) => setParsedResult({
                    ...parsedResult,
                    supplier: { ...parsedResult.supplier, gstNumber: val }
                  })}
                  style={styles.input}
                  activeOutlineColor="#3b82f6"
                  outlineColor="#1e293b"
                  textColor="#fff"
                />
              </Card.Content>
            </Card>

            {/* Invoice Metadata Card */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardHeader}>Invoice Details</Text>
                <View style={styles.row}>
                  <TextInput
                    label="Invoice No"
                    mode="outlined"
                    value={parsedResult.invoice.invoiceNumber}
                    onChangeText={(val) => setParsedResult({
                      ...parsedResult,
                      invoice: { ...parsedResult.invoice, invoiceNumber: val }
                    })}
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    activeOutlineColor="#3b82f6"
                    outlineColor="#1e293b"
                    textColor="#fff"
                  />
                  <TextInput
                    label="Invoice Date"
                    mode="outlined"
                    placeholder="YYYY-MM-DD"
                    value={parsedResult.invoice.invoiceDate}
                    onChangeText={(val) => setParsedResult({
                      ...parsedResult,
                      invoice: { ...parsedResult.invoice, invoiceDate: val }
                    })}
                    style={[styles.input, { flex: 1 }]}
                    activeOutlineColor="#3b82f6"
                    outlineColor="#1e293b"
                    textColor="#fff"
                  />
                </View>
              </Card.Content>
            </Card>

            {/* Medicines List Review */}
            <Text style={styles.sectionTitle}>Scanned Line Items ({parsedResult.items.length})</Text>
            {parsedResult.items.map((item, idx) => (
              <Card key={idx} style={styles.itemCard}>
                <Card.Content>
                  <Text style={styles.scannedName}>Scanned Name: "{item.name}"</Text>
                  
                  {/* Database Matching Status */}
                  <View style={styles.matchRow}>
                    {item.matchedMedicineId ? (
                      <View style={[styles.badge, styles.badgeSuccess]}>
                        <Text style={styles.badgeSuccessText}>✓ Linked: {item.matchedMedicineName}</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeWarning]}>
                        <Text style={styles.badgeWarningText}>+ Register as New Medicine</Text>
                      </View>
                    )}
                    <Button mode="text" compact onPress={() => openMatchModal(idx)} textColor="#3b82f6">
                      Link / Change
                    </Button>
                  </View>

                  {/* Quantity, Free Qty & Batch Number inputs */}
                  <View style={styles.row}>
                    <TextInput
                      label="Qty"
                      mode="outlined"
                      keyboardType="numeric"
                      value={String(item.quantity)}
                      onChangeText={(val) => handleUpdateItemValue(idx, 'quantity', val)}
                      style={[styles.input, { flex: 1, marginRight: 6 }]}
                      activeOutlineColor="#3b82f6"
                      outlineColor="#1e293b"
                      textColor="#fff"
                    />
                    <TextInput
                      label="Free Qty"
                      mode="outlined"
                      keyboardType="numeric"
                      value={String(item.freeQuantity || 0)}
                      onChangeText={(val) => handleUpdateItemValue(idx, 'freeQuantity', val)}
                      style={[styles.input, { flex: 1, marginRight: 6 }]}
                      activeOutlineColor="#3b82f6"
                      outlineColor="#1e293b"
                      textColor="#fff"
                    />
                    <TextInput
                      label="Batch No"
                      mode="outlined"
                      value={item.batchNumber}
                      onChangeText={(val) => handleUpdateItemValue(idx, 'batchNumber', val)}
                      style={[styles.input, { flex: 1.5 }]}
                      activeOutlineColor="#3b82f6"
                      outlineColor="#1e293b"
                      textColor="#fff"
                    />
                  </View>

                  {/* Expiry & GST inputs */}
                  <View style={styles.row}>
                    <TextInput
                      label="Expiry Date"
                      placeholder="YYYY-MM-DD"
                      mode="outlined"
                      value={item.expiryDate}
                      onChangeText={(val) => handleUpdateItemValue(idx, 'expiryDate', val)}
                      style={[styles.input, { flex: 1.5, marginRight: 8 }]}
                      activeOutlineColor="#3b82f6"
                      outlineColor="#1e293b"
                      textColor="#fff"
                    />
                    <TextInput
                      label="GST %"
                      mode="outlined"
                      keyboardType="numeric"
                      value={String(item.gstPercent)}
                      onChangeText={(val) => handleUpdateItemValue(idx, 'gstPercent', val)}
                      style={[styles.input, { flex: 1 }]}
                      activeOutlineColor="#3b82f6"
                      outlineColor="#1e293b"
                      textColor="#fff"
                    />
                  </View>

                  {/* Rate & MRP inputs */}
                  <View style={styles.row}>
                    <TextInput
                      label="Purchase Rate (₹)"
                      mode="outlined"
                      keyboardType="numeric"
                      value={String(item.purchaseRate)}
                      onChangeText={(val) => handleUpdateItemValue(idx, 'purchaseRate', val)}
                      style={[styles.input, { flex: 1, marginRight: 8 }]}
                      activeOutlineColor="#3b82f6"
                      outlineColor="#1e293b"
                      textColor="#fff"
                    />
                    <TextInput
                      label="MRP (₹)"
                      mode="outlined"
                      keyboardType="numeric"
                      value={String(item.mrp)}
                      onChangeText={(val) => handleUpdateItemValue(idx, 'mrp', val)}
                      style={[styles.input, { flex: 1 }]}
                      activeOutlineColor="#3b82f6"
                      outlineColor="#1e293b"
                      textColor="#fff"
                    />
                  </View>

                  {/* Row total summary */}
                  <View style={styles.itemCostSummary}>
                    <Text style={styles.costLabel}>Total Cost (inc. GST):</Text>
                    <Text style={styles.costValue}>₹{(item.quantity * item.purchaseRate * (1 + item.gstPercent / 100)).toFixed(2)}</Text>
                  </View>
                </Card.Content>
              </Card>
            ))}

            {/* Calculations Totals & Remarks */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardHeader}>Calculations & Import Remarks</Text>
                
                <TextInput
                  label="Remarks"
                  mode="outlined"
                  value={remarks}
                  onChangeText={setRemarks}
                  style={styles.input}
                  activeOutlineColor="#3b82f6"
                  outlineColor="#1e293b"
                  textColor="#fff"
                  placeholder="e.g. AI scanned invoice"
                />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal:</Text>
                  <Text style={styles.totalValue}>₹{parsedResult.totals.subTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>GST Tax Sum:</Text>
                  <Text style={styles.totalValue}>₹{parsedResult.totals.gstTotal.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, styles.netRow]}>
                  <Text style={styles.netLabel}>Net Payable:</Text>
                  <Text style={styles.netValue}>₹{parsedResult.totals.totalAmount.toFixed(2)}</Text>
                </View>
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={handleConfirmPurchase}
              style={styles.confirmBtn}
              buttonColor="#10b981"
              textColor="#fff"
              icon="check-circle-outline"
            >
              Confirm & Save to Stock
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Database Matching Modal */}
      <Modal visible={isMatchModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Link to Medicine Database</Text>
            
            <TextInput
              label="Search medicine name / formula..."
              mode="outlined"
              value={matchSearchQuery}
              onChangeText={setMatchSearchQuery}
              style={styles.modalSearch}
              activeOutlineColor="#3b82f6"
              outlineColor="#1e293b"
              textColor="#fff"
              left={<TextInput.Icon icon="magnify" />}
            />

            <FlatList
              data={filteredDbMedicines}
              keyExtractor={(med) => med._id}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalListItem}
                  onPress={() => selectMedicineMatch(item._id, item.name)}
                >
                  <Text style={styles.medNameText}>{item.name} ({item.strength})</Text>
                  <Text style={styles.medGenericText}>{item.genericName || 'Formula unmapped'}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[styles.modalListItem, { borderBottomColor: '#3b82f6', borderBottomWidth: 1.5 }]}
                  onPress={() => selectMedicineMatch(null, null)}
                >
                  <Text style={[styles.medNameText, { color: '#fbbf24' }]}>+ Register as [NEW MEDICINE]</Text>
                  <Text style={styles.medGenericText}>Add this drug into the master list upon save</Text>
                </TouchableOpacity>
              }
              ListEmptyComponent={
                <Text style={styles.emptyModalList}>No matches found. Select "Register as [NEW MEDICINE]" above.</Text>
              }
            />

            <Button mode="outlined" onPress={() => setIsMatchModalOpen(false)} textColor="#fff" style={styles.modalCloseBtn}>
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  imageBox: {
    width: '100%',
    height: 250,
    backgroundColor: '#0a0f1d',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#475569',
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
    justifyContent: 'center',
    marginVertical: 50,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  workbench: {
    marginTop: 10,
  },
  workbenchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workbenchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  warningBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningTitle: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
  },
  warningText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#0a0f1d',
    borderColor: '#1e293b',
    borderWidth: 1,
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#060912',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: '#0a0f1d',
    borderColor: '#1e293b',
    borderWidth: 1,
    marginBottom: 14,
    borderRadius: 12,
  },
  scannedName: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#060912',
    padding: 6,
    borderRadius: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  badgeSuccessText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 11,
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeWarningText: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 11,
  },
  itemCostSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  costLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  costValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  totalLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  totalValue: {
    color: '#fff',
    fontSize: 13,
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
    marginTop: 8,
  },
  netLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  netValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  confirmBtn: {
    marginVertical: 10,
    borderRadius: 10,
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#0a0f1d',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSearch: {
    marginBottom: 12,
    backgroundColor: '#060912',
  },
  modalList: {
    marginBottom: 16,
  },
  modalListItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  medNameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  medGenericText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  emptyModalList: {
    color: '#475569',
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  modalCloseBtn: {
    borderColor: '#1e293b',
    borderRadius: 8,
  },
});

export default OcrUploadScreen;
