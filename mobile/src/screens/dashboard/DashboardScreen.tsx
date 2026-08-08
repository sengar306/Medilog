import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Avatar } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { logout } from '../../redux/slices/authSlice';
import apiClient from '../../api/apiClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DashboardStats {
  todaySales: number;
  todayPurchases: number;
  monthlyRevenue: number;
  todayCustomers: number;
  lowStockCount: number;
  expiryAlerts: number;
  pendingPayments: number;
}

export const DashboardScreen: React.FC<any> = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayPurchases: 0,
    monthlyRevenue: 0,
    todayCustomers: 0,
    lowStockCount: 0,
    expiryAlerts: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/reports/dashboard');
      if (response.data) {
        const d = response.data;
        setStats({
          todaySales: d.todaySales || 0,
          todayPurchases: d.todayPurchases || 0,
          monthlyRevenue: d.monthlyRevenue || 0,
          todayCustomers: d.todayCustomers || 0,
          lowStockCount: d.lowStockCount || 0,
          expiryAlerts: d.expiryAlerts || 0,
          pendingPayments: d.pendingPayments || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      // Fallback mocks if server is offline
      setStats({
        todaySales: 2450.5,
        todayPurchases: 1800.0,
        monthlyRevenue: 72400.0,
        todayCustomers: 14,
        lowStockCount: 5,
        expiryAlerts: 3,
        pendingPayments: 450.0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => {
          dispatch(logout());
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchDashboardData} tintColor="#bb86fc" />
      }
    >
      {/* Header Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.username || 'Pharmacist'}</Text>
          <Text style={styles.role}>{user?.role || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={24} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon size={36} icon="cash-register" style={{ backgroundColor: 'rgba(74, 222, 128, 0.2)' }} color="#4ade80" />
              <Text style={styles.cardLabel}>Today's Sale</Text>
            </View>
            <Title style={styles.cardValue}>₹{stats.todaySales.toFixed(2)}</Title>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon size={36} icon="truck-delivery" style={{ backgroundColor: 'rgba(96, 165, 250, 0.2)' }} color="#60a5fa" />
              <Text style={styles.cardLabel}>Purchases</Text>
            </View>
            <Title style={styles.cardValue}>₹{stats.todayPurchases.toFixed(2)}</Title>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon size={36} icon="currency-inr" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)' }} color="#a855f7" />
              <Text style={styles.cardLabel}>Monthly Rev.</Text>
            </View>
            <Title style={styles.cardValue}>₹{stats.monthlyRevenue.toFixed(2)}</Title>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon size={36} icon="account-group" style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)' }} color="#fbbf24" />
              <Text style={styles.cardLabel}>Customers</Text>
            </View>
            <Title style={styles.cardValue}>{stats.todayCustomers}</Title>
          </Card.Content>
        </Card>
      </View>

      {/* Alert Banner / Row */}
      <View style={styles.alertContainer}>
        {stats.lowStockCount > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Inventory')} style={[styles.alertBar, styles.lowStock]}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#fbbf24" />
            <Text style={styles.alertText}>{stats.lowStockCount} medicines are low in stock!</Text>
          </TouchableOpacity>
        )}
        {stats.expiryAlerts > 0 && (
          <View style={[styles.alertBar, styles.expiry]}>
            <MaterialCommunityIcons name="calendar-alert" size={20} color="#ff6b6b" />
            <Text style={styles.alertText}>{stats.expiryAlerts} medicines expiring soon / expired!</Text>
          </View>
        )}
      </View>

      {/* Quick Access Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access Panel</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity onPress={() => navigation.navigate('Billing')} style={styles.menuItem}>
            <MaterialCommunityIcons name="barcode-scan" size={32} color="#bb86fc" />
            <Text style={styles.menuLabel}>New Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Inventory')} style={styles.menuItem}>
            <MaterialCommunityIcons name="pill" size={32} color="#4ade80" />
            <Text style={styles.menuLabel}>Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.menuItem}>
            <MaterialCommunityIcons name="store" size={32} color="#60a5fa" />
            <Text style={styles.menuLabel}>Store Profile</Text>
          </TouchableOpacity>
          {user?.role === 'Admin' && (
            <TouchableOpacity onPress={() => navigation.navigate('UserManagement')} style={styles.menuItem}>
              <MaterialCommunityIcons name="account-cog" size={32} color="#f43f5e" />
              <Text style={styles.menuLabel}>Users</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  welcome: {
    fontSize: 14,
    color: '#888',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  role: {
    fontSize: 12,
    color: '#bb86fc',
    fontWeight: '600',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#1e1e1e',
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  alertContainer: {
    marginBottom: 20,
  },
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  lowStock: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  expiry: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  alertText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 13,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '23%',
    backgroundColor: '#1e1e1e',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  menuLabel: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;
