import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { Card, IconButton, Button, Chip, Title, ActivityIndicator, TextInput } from 'react-native-paper';
import apiClient from '../../api/apiClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type InventoryTab = 'batches' | 'alerts' | 'ledger';

export const InventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('batches');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Chemist Store Selector for Admin
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Batches State
  const [batches, setBatches] = useState<any[]>([]);
  const [batchStatusFilter, setBatchStatusFilter] = useState<'active' | 'near-expiry' | 'expired'>('active');

  // Alerts State
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [nearExpiryAlerts, setNearExpiryAlerts] = useState<any[]>([]);

  // Ledger State
  const [ledger, setLedger] = useState<any[]>([]);

  // Check if admin & load users
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const usersRes = await apiClient.get('/users');
        if (usersRes.data) {
          setIsAdmin(true);
          setUsersList(usersRes.data);
        }
      } catch (err) {
        setIsAdmin(false);
      }
    };
    checkUserRole();
  }, []);

  const fetchBatches = async (status: string, targetUserId: string = selectedUserId) => {
    setLoading(true);
    try {
      let url = `/inventory?status=${status}`;
      if (targetUserId && targetUserId !== 'all') {
        url += `&userId=${targetUserId}`;
      }
      const res = await apiClient.get(url);
      if (res.data) {
        setBatches(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory batches', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async (targetUserId: string = selectedUserId) => {
    setLoading(true);
    try {
      let lowStockUrl = '/inventory/low-stock';
      let nearExpiryUrl = '/inventory?status=near-expiry';
      if (targetUserId && targetUserId !== 'all') {
        lowStockUrl += `?userId=${targetUserId}`;
        nearExpiryUrl += `&userId=${targetUserId}`;
      }

      // 1. Fetch low stock
      const lowStockRes = await apiClient.get(lowStockUrl);
      if (lowStockRes.data) {
        setLowStock(lowStockRes.data);
      }
      // 2. Fetch near-expiry
      const nearExpiryRes = await apiClient.get(nearExpiryUrl);
      if (nearExpiryRes.data) {
        setNearExpiryAlerts(nearExpiryRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch stock alerts', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (targetUserId: string = selectedUserId) => {
    setLoading(true);
    try {
      let url = '/inventory/ledger';
      if (targetUserId && targetUserId !== 'all') {
        url += `?userId=${targetUserId}`;
      }
      const res = await apiClient.get(url);
      if (res.data) {
        setLedger(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch stock ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches(batchStatusFilter, selectedUserId);
    } else if (activeTab === 'alerts') {
      fetchAlerts(selectedUserId);
    } else if (activeTab === 'ledger') {
      fetchLedger(selectedUserId);
    }
  }, [activeTab, batchStatusFilter, selectedUserId]);

  const handleRefresh = () => {
    if (activeTab === 'batches') {
      fetchBatches(batchStatusFilter, selectedUserId);
    } else if (activeTab === 'alerts') {
      fetchAlerts(selectedUserId);
    } else if (activeTab === 'ledger') {
      fetchLedger(selectedUserId);
    }
  };

  const getBatchStatusInfo = (expiryDateStr: string) => {
    const today = new Date();
    const exp = new Date(expiryDateStr);
    if (exp < today) {
      return { text: 'EXPIRED', color: '#ff6b6b', bg: 'rgba(239, 68, 68, 0.1)' };
    }
    const limit = new Date();
    limit.setDate(today.getDate() + 90);
    if (exp <= limit) {
      return { text: 'NEAR EXPIRY', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)' };
    }
    return { text: 'SAFE', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  };

  const getTxTypeStyle = (type: string) => {
    if (type === 'Purchase') return { text: 'Purchase', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' };
    if (type === 'Sale') return { text: 'Sale', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (type === 'Expiry') return { text: 'Expiry', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    return { text: type, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)' }; // Adjustment
  };

  // Search filtering logic
  const filteredBatches = batches.filter((b) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (b.medicine?.name && b.medicine.name.toLowerCase().includes(query)) ||
      (b.medicine?.strength && b.medicine.strength.toLowerCase().includes(query)) ||
      (b.batchNumber && b.batchNumber.toLowerCase().includes(query)) ||
      (b.supplier?.name && b.supplier.name.toLowerCase().includes(query)) ||
      (b.medicine?.rack?.name && b.medicine.rack.name.toLowerCase().includes(query))
    );
  });

  const filteredLowStock = lowStock.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (item.medicine?.name && item.medicine.name.toLowerCase().includes(query)) ||
      (item.medicine?.strength && item.medicine.strength.toLowerCase().includes(query)) ||
      (item.medicine?.rack?.name && item.medicine.rack.name.toLowerCase().includes(query))
    );
  });

  const filteredNearExpiryAlerts = nearExpiryAlerts.filter((batch) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (batch.medicine?.name && batch.medicine.name.toLowerCase().includes(query)) ||
      (batch.medicine?.strength && batch.medicine.strength.toLowerCase().includes(query)) ||
      (batch.batchNumber && batch.batchNumber.toLowerCase().includes(query))
    );
  });

  const filteredLedger = ledger.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (item.medicine?.name && item.medicine.name.toLowerCase().includes(query)) ||
      (item.medicine?.strength && item.medicine.strength.toLowerCase().includes(query)) ||
      (item.batchNumber && item.batchNumber.toLowerCase().includes(query)) ||
      (item.remarks && item.remarks.toLowerCase().includes(query)) ||
      (item.user?.username && item.user.username.toLowerCase().includes(query)) ||
      (item.transactionType && item.transactionType.toLowerCase().includes(query))
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Inventory & Ledger</Title>
        <Text style={styles.subtitle}>Monitor batch stock levels, alerts, and ledger history</Text>
      </View>

      {/* Search Input */}
      <TextInput
        placeholder="Filter by name, batch, user, remarks..."
        mode="outlined"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchBar}
        activeOutlineColor="#3b82f6"
        outlineColor="#1e293b"
        textColor="#fff"
        left={<TextInput.Icon icon="magnify" />}
        right={
          searchQuery ? (
            <TextInput.Icon icon="close-circle" onPress={() => setSearchQuery('')} />
          ) : undefined
        }
      />

      {/* Admin Chemist Selector Chip Bar */}
      {isAdmin && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
            🏥 Filter Chemist Store:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip
              selected={selectedUserId === 'all'}
              onPress={() => setSelectedUserId('all')}
              selectedColor="#3b82f6"
              style={styles.chip}
              textStyle={styles.chipText}
              showSelectedOverlay
            >
              All Chemists
            </Chip>
            {usersList.map((u) => (
              <Chip
                key={u._id}
                selected={selectedUserId === u._id}
                onPress={() => setSelectedUserId(u._id)}
                selectedColor="#3b82f6"
                style={styles.chip}
                textStyle={styles.chipText}
                showSelectedOverlay
              >
                {u.chemistName || u.username}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'batches' && styles.activeTabButton]}
          onPress={() => setActiveTab('batches')}
        >
          <MaterialCommunityIcons name="package-variant-closed" size={18} color={activeTab === 'batches' ? '#3b82f6' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'batches' && styles.activeTabText]}>Batches</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'alerts' && styles.activeTabButton]}
          onPress={() => setActiveTab('alerts')}
        >
          <MaterialCommunityIcons name="alert-octagon" size={18} color={activeTab === 'alerts' ? '#3b82f6' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ledger' && styles.activeTabButton]}
          onPress={() => setActiveTab('ledger')}
        >
          <MaterialCommunityIcons name="history" size={18} color={activeTab === 'ledger' ? '#3b82f6' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'ledger' && styles.activeTabText]}>Ledger</Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Batches in Stock */}
      {activeTab === 'batches' && (
        <View style={{ flex: 1 }}>
          <View style={styles.filterRow}>
            <Chip
              selected={batchStatusFilter === 'active'}
              onPress={() => setBatchStatusFilter('active')}
              selectedColor="#3b82f6"
              style={styles.chip}
              textStyle={styles.chipText}
              showSelectedOverlay
            >
              Active Stock
            </Chip>
            <Chip
              selected={batchStatusFilter === 'near-expiry'}
              onPress={() => setBatchStatusFilter('near-expiry')}
              selectedColor="#3b82f6"
              style={styles.chip}
              textStyle={styles.chipText}
              showSelectedOverlay
            >
              Near Expiry
            </Chip>
            <Chip
              selected={batchStatusFilter === 'expired'}
              onPress={() => setBatchStatusFilter('expired')}
              selectedColor="#3b82f6"
              style={styles.chip}
              textStyle={styles.chipText}
              showSelectedOverlay
            >
              Expired
            </Chip>
          </View>

          <FlatList
            data={filteredBatches}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor="#3b82f6" />
            }
            renderItem={({ item }) => {
              const statusInfo = getBatchStatusInfo(item.expiryDate);
              const storeName = item.user?.chemistName || item.medicine?.user?.chemistName || 'Central Store';
              return (
                <Card style={styles.card}>
                  <Card.Content>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medName}>{item.medicine?.name} <Text style={styles.strengthText}>({item.medicine?.strength})</Text></Text>
                        <Text style={{ color: '#38bdf8', fontSize: 11, marginTop: 2, fontWeight: '600' }}>
                          <MaterialCommunityIcons name="storefront-outline" size={12} color="#38bdf8" /> Store: {storeName}
                        </Text>
                        <Text style={styles.batchNo}>Batch: <Text style={styles.boldText}>{item.batchNumber}</Text></Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
                      </View>
                    </View>

                    <View style={styles.infoGrid}>
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Quantity Left</Text>
                        <Text style={styles.infoValue}>{item.quantity} / {item.initialQuantity}</Text>
                      </View>
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Expiry Date</Text>
                        <Text style={styles.infoValue}>{new Date(item.expiryDate).toLocaleDateString()}</Text>
                      </View>
                    </View>

                    <View style={styles.infoGrid}>
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Rates (P.Rate / MRP)</Text>
                        <Text style={styles.infoValue}>₹{item.purchaseRate.toFixed(2)} / ₹{item.mrp.toFixed(2)}</Text>
                      </View>
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Rack Location</Text>
                        <Text style={styles.infoValue}>
                          <MaterialCommunityIcons name="map-marker-outline" size={12} color="#94a3b8" /> {item.medicine?.rack?.name || 'Unmapped'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.supplierRow}>
                      <Text style={styles.supplierText}>Supplier: {item.supplier ? item.supplier.name : 'Unknown'}</Text>
                    </View>
                  </Card.Content>
                </Card>
              );
            }}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color="#3b82f6" />
              ) : (
                <Text style={styles.emptyText}>No stock batches found.</Text>
              )
            }
          />
        </View>
      )}

      {/* Tab 2: Stock Alerts */}
      {activeTab === 'alerts' && (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor="#3b82f6" />
          }
        >
          {/* Low Stock Reorder List */}
          <Text style={styles.sectionHeader}><MaterialCommunityIcons name="arrow-down-bold-box" size={16} color="#ef4444" /> Low Stock (Reorder Items)</Text>
          {filteredLowStock.length === 0 ? (
            <Text style={styles.alertEmpty}>All stock levels healthy!</Text>
          ) : (
            filteredLowStock.map((item) => (
              <Card key={item.medicine._id} style={[styles.card, { borderLeftColor: '#ef4444', borderLeftWidth: 3 }]}>
                <Card.Content style={styles.alertCardContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{item.medicine.name} <Text style={styles.strengthText}>({item.medicine.strength})</Text></Text>
                    <Text style={{ color: '#38bdf8', fontSize: 11, marginTop: 2 }}>Store: {item.medicine.user?.chemistName || 'Central Store'}</Text>
                    <Text style={styles.alertSub}>Rack: {item.medicine.rack ? item.medicine.rack.name : 'Unmapped'}</Text>
                  </View>
                  <View style={styles.alertStockBox}>
                    <Text style={styles.alertStockVal}>{item.currentStock}</Text>
                    <Text style={styles.alertStockLabel}>Left (Min: {item.minStockLevel})</Text>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}

          {/* Near Expiry List */}
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}><MaterialCommunityIcons name="calendar-clock" size={16} color="#fbbf24" /> Expiring Soon (90 Days)</Text>
          {filteredNearExpiryAlerts.length === 0 ? (
            <Text style={styles.alertEmpty}>No stock batches expiring soon.</Text>
          ) : (
            filteredNearExpiryAlerts.map((batch) => (
              <Card key={batch._id} style={[styles.card, { borderLeftColor: '#fbbf24', borderLeftWidth: 3 }]}>
                <Card.Content style={styles.alertCardContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{batch.medicine?.name} <Text style={styles.strengthText}>({batch.medicine?.strength})</Text></Text>
                    <Text style={{ color: '#38bdf8', fontSize: 11, marginTop: 2 }}>Store: {batch.user?.chemistName || batch.medicine?.user?.chemistName || 'Central Store'}</Text>
                    <Text style={styles.alertSub}>Batch: {batch.batchNumber} | Expiry: {new Date(batch.expiryDate).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.alertStockBox}>
                    <Text style={[styles.alertStockVal, { color: '#fbbf24' }]}>{batch.quantity}</Text>
                    <Text style={styles.alertStockLabel}>Units</Text>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {/* Tab 3: Transaction Ledger */}
      {activeTab === 'ledger' && (
        <FlatList
          data={filteredLedger}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor="#3b82f6" />
          }
          renderItem={({ item }) => {
            const typeStyle = getTxTypeStyle(item.transactionType);
            const isNegative = item.quantity < 0;
            const chemistName = item.user?.chemistName || item.user?.username || 'System';
            return (
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{item.medicine ? item.medicine.name : 'Unknown'} <Text style={styles.strengthText}>({item.medicine?.strength || ''})</Text></Text>
                      <Text style={{ color: '#38bdf8', fontSize: 11, marginTop: 2 }}>Chemist: {chemistName}</Text>
                      <Text style={styles.batchNo}>Batch: <Text style={styles.boldText}>{item.batchNumber}</Text></Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: typeStyle.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: typeStyle.color }]}>{typeStyle.text}</Text>
                    </View>
                  </View>

                  <View style={styles.ledgerGrid}>
                    <View style={styles.ledgerValBox}>
                      <Text style={styles.infoLabel}>Stock Change</Text>
                      <Text style={[styles.ledgerChangeVal, { color: isNegative ? '#ef4444' : '#10b981' }]}>
                        {isNegative ? '' : '+'}{item.quantity} units
                      </Text>
                    </View>
                    <View style={styles.ledgerValBox}>
                      <Text style={styles.infoLabel}>Balance (Prev → New)</Text>
                      <Text style={styles.infoValue}>{item.previousStock} → {item.newStock}</Text>
                    </View>
                  </View>

                  <View style={styles.ledgerFooterRow}>
                    <Text style={styles.ledgerRemarks}>{item.remarks || 'Stock adjustment'}</Text>
                    <Text style={styles.ledgerMeta}>
                      Chemist: {chemistName} | {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color="#3b82f6" />
            ) : (
              <Text style={styles.emptyText}>No stock ledger entries found.</Text>
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060912',
    padding: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#0a0f1d',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0a0f1d',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    backgroundColor: '#0a0f1d',
    borderColor: '#1e293b',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  card: {
    backgroundColor: '#0a0f1d',
    borderColor: '#1e293b',
    borderWidth: 1,
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 10,
    marginBottom: 10,
  },
  medName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  strengthText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 'normal',
  },
  batchNo: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  boldText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: '#475569',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  supplierRow: {
    marginTop: 8,
    borderTopColor: '#1e293b',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  supplierText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  sectionHeader: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  alertStockBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060912',
    padding: 10,
    borderRadius: 8,
    minWidth: 80,
  },
  alertStockVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  alertStockLabel: {
    fontSize: 9,
    color: '#475569',
    marginTop: 2,
  },
  alertEmpty: {
    color: '#10b981',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 14,
    fontSize: 12,
  },
  ledgerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  ledgerValBox: {
    flex: 1,
  },
  ledgerChangeVal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  ledgerFooterRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerRemarks: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1.2,
  },
  ledgerMeta: {
    color: '#475569',
    fontSize: 10,
    textAlign: 'right',
    flex: 1,
  },
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
});

export default InventoryScreen;
