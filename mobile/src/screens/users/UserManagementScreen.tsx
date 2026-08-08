import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, Alert, Modal, ScrollView } from 'react-native';
import { Card, Button, TextInput, IconButton, Switch, Title, HelperText } from 'react-native-paper';
import apiClient from '../../api/apiClient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface User {
  _id: string;
  username: string;
  email: string;
  role: { _id: string; name: string } | string;
  isActive: boolean;
}

export const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Add User Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'User'>('User');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/users');
      if (response.data) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error(err);
      // Fallback mocks
      setUsers([
        { _id: '1', username: 'admin', email: 'admin@medilog.com', role: 'Admin', isActive: true },
        { _id: '2', username: 'user', email: 'user@medilog.com', role: 'User', isActive: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await apiClient.put(`/users/${id}`, { isActive: !currentStatus });
      Alert.alert('Success', 'User active status toggled.');
      fetchUsers();
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle status.');
    }
  };

  const handleAddUser = async () => {
    if (!username || !email || !password) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/users', {
        username,
        email,
        password,
        roleName: selectedRole,
      });
      Alert.alert('Success', 'User created successfully.');
      setIsOpen(false);
      setUsername('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err) {
      Alert.alert('Error', 'Failed to create user. Verify backend connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>👥 User Administration</Title>
        <Button mode="contained" icon="plus" onPress={() => setIsOpen(true)} buttonColor="#bb86fc" textColor="#000" compact>
          Add User
        </Button>
      </View>

      {/* Add User Modal */}
      <Modal visible={isOpen} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Add New Chemist User</Text>
          
          <TextInput
            label="Username"
            mode="outlined"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
          />

          <TextInput
            label="Email Address"
            mode="outlined"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
          />

          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
          />

          <View style={styles.roleSelect}>
            <Text style={styles.roleLabel}>User Role:</Text>
            <View style={styles.roleRow}>
              {(['Admin', 'User'] as const).map((r) => (
                <Button
                  key={r}
                  mode={selectedRole === r ? 'contained' : 'outlined'}
                  onPress={() => setSelectedRole(r)}
                  style={styles.roleBtn}
                  buttonColor={selectedRole === r ? '#bb86fc' : undefined}
                  textColor={selectedRole === r ? '#000' : '#bb86fc'}
                >
                  {r}
                </Button>
              ))}
            </View>
          </View>

          <Button mode="contained" onPress={handleAddUser} loading={saving} disabled={saving} style={styles.submitBtn} buttonColor="#bb86fc" textColor="#000">
            Create User
          </Button>
          <Button mode="text" onPress={() => setIsOpen(false)} textColor="#ff6b6b">
            Cancel
          </Button>
        </ScrollView>
      </Modal>

      {/* User List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={fetchUsers}
        renderItem={({ item }) => {
          const roleName = typeof item.role === 'object' ? item.role.name : item.role;
          return (
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.username}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <Text style={styles.userRole}>Role: {roleName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.statusText, item.isActive ? { color: '#4ade80' } : { color: '#ff6b6b' }]}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => handleToggleActive(item._id, item.isActive)}
                    color="#4ade80"
                  />
                </View>
              </Card.Content>
            </Card>
          );
        }}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
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
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  userRole: {
    color: '#bb86fc',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    marginRight: 6,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  modalContent: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#bb86fc',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#1e1e1e',
  },
  roleSelect: {
    marginVertical: 10,
  },
  roleLabel: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
  },
  roleBtn: {
    flex: 1,
    marginHorizontal: 4,
  },
  submitBtn: {
    marginTop: 24,
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default UserManagementScreen;
