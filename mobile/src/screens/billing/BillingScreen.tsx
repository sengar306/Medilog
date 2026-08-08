import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, FlatList, Modal, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Card, Title, IconButton, HelperText } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import apiClient from '../../api/apiClient';
import ScannerView from '../../components/ScannerView';
import { PDFInvoiceBuilder } from '../../utils/pdfInvoiceBuilder';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Medicine {
  _id: string;
  name: string;
  code?: string;
  mrp: number;
  gstPercent?: number;
  rackLocation?: string;
  stock?: number;
}

interface CartItem {
  medicine: Medicine;
  quantity: number;
  rate: number;
  gstPercent: number;
  total: number;
}

export const BillingScreen: React.FC = () => {
  const isOnline = useSelector((state: RootState) => state.sync.isOnline);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Search Medicines
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await apiClient.get(`/medicines?query=${searchQuery}`);
        if (response.data) {
          setSearchResults(response.data.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to query medicines', err);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Barcode Scanned Callback
  const handleBarcodeScan = async (code: string) => {
    setIsScannerOpen(false);
    try {
      const response = await apiClient.get(`/medicines?query=${code}`);
      if (response.data && response.data.length > 0) {
        const med = response.data[0];
        addToCart(med);
      } else {
        Alert.alert('Not Found', `No medicine found with barcode code: ${code}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to search medicine by barcode.');
    }
  };

  const addToCart = (med: Medicine) => {
    const existing = cart.find((item) => item.medicine._id === med._id);
    if (existing) {
      updateQty(med._id, existing.quantity + 1);
    } else {
      const mrpVal = med.mrp || 0;
      const gstVal = med.gstPercent || 18;
      const totalVal = mrpVal;
      setCart([...cart, {
        medicine: med,
        quantity: 1,
        rate: mrpVal,
        gstPercent: gstVal,
        total: totalVal
      }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((item) => item.medicine._id !== id));
      return;
    }
    setCart(
      cart.map((item) => {
        if (item.medicine._id === id) {
          const totalVal = qty * item.rate;
          return { ...item, quantity: qty, total: totalVal };
        }
        return item;
      })
    );
  };

  const calculateSubtotal = () => {
    return cart.reduce((acc, item) => acc + item.total, 0);
  };

  const calculateGstTotal = () => {
    return cart.reduce((acc, item) => {
      const itemGst = item.total - (item.total / (1 + item.gstPercent / 100));
      return acc + itemGst;
    }, 0);
  };

  const calculateGrandTotal = () => {
    const discountVal = parseFloat(discount) || 0;
    return Math.max(0, calculateSubtotal() - discountVal);
  };

  // Perform Sale Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add at least one medicine to check out.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        items: cart.map((item) => ({
          medicineId: item.medicine._id,
          quantity: item.quantity,
        })),
        discountAmount: parseFloat(discount) || 0,
        paymentMode,
      };

      const response = await apiClient.post('/sales', payload);
      if (response.status === 201 && response.data?.sale) {
        const { sale } = response.data;
        Alert.alert(
          'Sale Complete',
          `Invoice #${sale.invoiceNumber} generated! Options:`,
          [
            {
              text: 'Print Receipt',
              onPress: () => {
                PDFInvoiceBuilder.printInvoice({
                  invoiceNumber: sale.invoiceNumber,
                  customerName: customerName || 'Walk-in Customer',
                  customerPhone,
                  items: cart.map(c => ({
                    medicineName: c.medicine.name,
                    quantity: c.quantity,
                    rate: c.rate,
                    mrp: c.rate,
                    gstPercent: c.gstPercent,
                    totalAmount: c.total
                  })),
                  discountAmount: parseFloat(discount) || 0,
                  taxAmount: calculateGstTotal(),
                  totalAmount: calculateGrandTotal(),
                  paymentMode,
                  createdAt: new Date().toISOString(),
                  businessName: 'MediLog Pharmacy'
                });
              }
            },
            {
              text: 'Share PDF',
              onPress: () => {
                PDFInvoiceBuilder.shareInvoice({
                  invoiceNumber: sale.invoiceNumber,
                  customerName: customerName || 'Walk-in Customer',
                  customerPhone,
                  items: cart.map(c => ({
                    medicineName: c.medicine.name,
                    quantity: c.quantity,
                    rate: c.rate,
                    mrp: c.rate,
                    gstPercent: c.gstPercent,
                    totalAmount: c.total
                  })),
                  discountAmount: parseFloat(discount) || 0,
                  taxAmount: calculateGstTotal(),
                  totalAmount: calculateGrandTotal(),
                  paymentMode,
                  createdAt: new Date().toISOString(),
                  businessName: 'MediLog Pharmacy'
                });
              }
            },
            { text: 'Done', style: 'cancel' }
          ]
        );

        // Reset POS
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setDiscount('0');
      }
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.response?.data?.message || 'Error processing sales billing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Scanner Modal */}
      <Modal visible={isScannerOpen} animationType="slide">
        <ScannerView onScan={handleBarcodeScan} onClose={() => setIsScannerOpen(false)} />
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Title style={styles.title}>Retail POS Checkout</Title>
          <IconButton icon="camera" size={24} mode="contained" containerColor="#bb86fc" iconColor="#000" onPress={() => setIsScannerOpen(true)} />
        </View>

        {/* Customer Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionHeader}>Customer Details</Text>
            <TextInput
              label="Customer Name"
              mode="outlined"
              value={customerName}
              onChangeText={setCustomerName}
              style={styles.input}
              activeOutlineColor="#bb86fc"
              outlineColor="#333"
              textColor="#fff"
            />
            <TextInput
              label="Phone Number"
              mode="outlined"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              style={styles.input}
              activeOutlineColor="#bb86fc"
              outlineColor="#333"
              textColor="#fff"
            />
          </Card.Content>
        </Card>

        {/* Medicine Selector autocomplete */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionHeader}>Add Medicines</Text>
            <TextInput
              label="Search medicine name / barcode..."
              mode="outlined"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.input}
              activeOutlineColor="#bb86fc"
              outlineColor="#333"
              textColor="#fff"
            />
            {searchResults.length > 0 && (
              <View style={styles.dropdown}>
                {searchResults.map((item) => (
                  <TouchableOpacity key={item._id} style={styles.dropdownItem} onPress={() => addToCart(item)}>
                    <Text style={styles.dropText}>{item.name}</Text>
                    <Text style={styles.dropSub}>MRP: ₹{item.mrp} | Stock: {item.stock || 0}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Cart Listing */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionHeader}>POS Cart Items</Text>
            {cart.length === 0 ? (
              <Text style={styles.empty}>Your cart is currently empty.</Text>
            ) : (
              cart.map((item) => (
                <View key={item.medicine._id} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartName}>{item.medicine.name}</Text>
                    <Text style={styles.cartSub}>Rate: ₹{item.rate} | GST: {item.gstPercent}%</Text>
                  </View>
                  <View style={styles.qtyContainer}>
                    <IconButton icon="minus" size={16} onPress={() => updateQty(item.medicine._id, item.quantity - 1)} />
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <IconButton icon="plus" size={16} onPress={() => updateQty(item.medicine._id, item.quantity + 1)} />
                  </View>
                  <Text style={styles.cartTotal}>₹{item.total.toFixed(2)}</Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Payment Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionHeader}>Billing Summary</Text>
            
            <TextInput
              label="Discount Amount (INR)"
              mode="outlined"
              keyboardType="numeric"
              value={discount}
              onChangeText={setDiscount}
              style={styles.input}
              activeOutlineColor="#bb86fc"
              outlineColor="#333"
              textColor="#fff"
            />

            <View style={styles.paymentSelect}>
              <Text style={styles.paymentLabel}>Payment Mode:</Text>
              <View style={styles.payRow}>
                {(['Cash', 'Card', 'UPI'] as const).map((mode) => (
                  <Button
                    key={mode}
                    mode={paymentMode === mode ? 'contained' : 'outlined'}
                    onPress={() => setPaymentMode(mode)}
                    compact
                    style={styles.payBtn}
                    buttonColor={paymentMode === mode ? '#bb86fc' : undefined}
                    textColor={paymentMode === mode ? '#000' : '#bb86fc'}
                  >
                    {mode}
                  </Button>
                ))}
              </View>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₹{calculateSubtotal().toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST Total:</Text>
              <Text style={styles.summaryValue}>₹{calculateGstTotal().toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 8 }]}>
              <Text style={[styles.summaryLabel, { fontSize: 16, fontWeight: 'bold' }]}>Grand Total:</Text>
              <Text style={[styles.summaryValue, { fontSize: 18, color: '#bb86fc', fontWeight: 'bold' }]}>₹{calculateGrandTotal().toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleCheckout}
          loading={loading}
          disabled={loading || cart.length === 0}
          style={styles.checkoutBtn}
          buttonColor="#bb86fc"
          textColor="#000"
        >
          Generate Invoice (Checkout)
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1e1e1e',
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    fontSize: 14,
    color: '#bb86fc',
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#151515',
  },
  dropdown: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 10,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  dropText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  dropSub: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  cartName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cartSub: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    marginHorizontal: 12,
  },
  qtyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartTotal: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    width: 70,
    textAlign: 'right',
  },
  paymentSelect: {
    marginVertical: 10,
  },
  paymentLabel: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payBtn: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  summaryLabel: {
    color: '#aaa',
    fontSize: 13,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  checkoutBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
});

export default BillingScreen;
