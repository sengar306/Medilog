import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { TextInput, Card, IconButton, Button, Chip } from 'react-native-paper';
import apiClient from '../../api/apiClient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Medicine {
  _id: string;
  name: string;
  code?: string;
  mrp: number;
  gstPercent?: number;
  rackLocation?: string;
  stock?: number;
  minimumStockLevel?: number;
}

export const InventoryScreen: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/medicines');
      if (response.data) {
        setMedicines(response.data);
      }
    } catch (err) {
      console.error(err);
      // fallback mock values
      setMedicines([
        { _id: '1', name: 'Paracetamol 650mg', mrp: 15.0, stock: 120, rackLocation: 'A-12', minimumStockLevel: 20 },
        { _id: '2', name: 'Amoxicillin 500mg', mrp: 85.5, stock: 12, rackLocation: 'B-3', minimumStockLevel: 15 },
        { _id: '3', name: 'Ranitidine 150mg', mrp: 22.0, stock: 45, rackLocation: 'A-4', minimumStockLevel: 10 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Medicine', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await apiClient.delete(`/medicines/${id}`);
            Alert.alert('Success', 'Medicine deleted successfully.');
            fetchInventory();
          } catch (err) {
            Alert.alert('Failed', 'Failed to delete medicine master. Check Admin permissions.');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(search.toLowerCase()) || 
                          (med.code && med.code.includes(search));
    const isLow = med.stock !== undefined && med.minimumStockLevel !== undefined && med.stock < med.minimumStockLevel;
    
    if (filterLowStock) {
      return matchesSearch && isLow;
    }
    return matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medicine Inventory</Text>
      </View>

      <View style={styles.searchBarContainer}>
        <TextInput
          label="Search name, code, barcode..."
          mode="outlined"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          activeOutlineColor="#bb86fc"
          outlineColor="#333"
          textColor="#fff"
          left={<TextInput.Icon icon="magnify" />}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <Chip
          selected={filterLowStock}
          onPress={() => setFilterLowStock(!filterLowStock)}
          selectedColor="#bb86fc"
          style={styles.chip}
          showSelectedOverlay
        >
          Low Stock Only
        </Chip>
        <Chip
          selected={!filterLowStock}
          onPress={() => setFilterLowStock(false)}
          selectedColor={!filterLowStock ? '#bb86fc' : undefined}
          style={styles.chip}
        >
          Show All
        </Chip>
      </View>

      {/* Medicine Listing */}
      <FlatList
        data={filteredMedicines}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchInventory} tintColor="#bb86fc" />
        }
        renderItem={({ item }) => {
          const isLow = item.stock !== undefined && item.minimumStockLevel !== undefined && item.stock < item.minimumStockLevel;
          
          return (
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                  <View style={styles.medHeader}>
                    <Text style={styles.medName}>{item.name}</Text>
                    {isLow && (
                      <View style={styles.lowStockBadge}>
                        <Text style={styles.badgeText}>LOW STOCK</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.medLocation}>
                    <MaterialCommunityIcons name="tag-outline" size={13} color="#888" /> Location: {item.rackLocation || 'Unmapped'}
                  </Text>
                  <View style={styles.row}>
                    <Text style={styles.statsLabel}>MRP: <Text style={styles.statsVal}>₹{item.mrp.toFixed(2)}</Text></Text>
                    <Text style={styles.statsLabel}>Stock: <Text style={[styles.statsVal, isLow ? { color: '#ff6b6b' } : { color: '#4ade80' }]}>{item.stock || 0} units</Text></Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <IconButton icon="delete" iconColor="#ff6b6b" size={20} onPress={() => handleDelete(item._id, item.name)} />
                </View>
              </Card.Content>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No medicines found matching the criteria.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBarContainer: {
    marginBottom: 12,
  },
  search: {
    backgroundColor: '#1e1e1e',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    backgroundColor: '#1e1e1e',
  },
  card: {
    backgroundColor: '#1e1e1e',
    marginBottom: 12,
    borderRadius: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  medName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lowStockBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ff6b6b',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 10,
  },
  badgeText: {
    color: '#ff6b6b',
    fontSize: 9,
    fontWeight: 'bold',
  },
  medLocation: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statsLabel: {
    color: '#888',
    fontSize: 12,
    marginRight: 16,
  },
  statsVal: {
    fontWeight: 'bold',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
});

export default InventoryScreen;
