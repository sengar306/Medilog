import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card, Switch, Title, Divider } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { toggleThemeMode } from '../../redux/slices/authSlice';
import apiClient from '../../api/apiClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const SettingsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const themeMode = useSelector((state: RootState) => state.auth.themeMode);
  
  // WhatsApp settings state
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [metaBusinessId, setMetaBusinessId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load WhatsApp Config from backend
  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/whatsapp/config');
      if (response.data && response.data.data) {
        const d = response.data.data;
        setMetaAccessToken(d.metaAccessToken || '');
        setMetaPhoneNumberId(d.metaPhoneNumberId || '');
        setMetaBusinessId(d.metaBusinessId || '');
        setBusinessName(d.businessName || '');
        setSenderNumber(d.senderNumber || '');
      }
    } catch (err) {
      console.error('Failed to load WhatsApp configuration settings.', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    if (!metaAccessToken || !metaPhoneNumberId || !metaBusinessId) {
      Alert.alert('Validation Error', 'Meta Access Token, Phone ID, and Business Account ID are required.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/whatsapp/config', {
        metaAccessToken,
        metaPhoneNumberId,
        metaBusinessId,
        businessName,
        senderNumber,
      });
      Alert.alert('Success', 'WhatsApp Cloud API configuration saved successfully.');
      loadConfig();
    } catch (err) {
      Alert.alert('Error', 'Failed to save WhatsApp settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>⚙️ Settings</Title>
        <Text style={styles.subtitle}>Configure mobile system settings and WhatsApp Cloud integration</Text>
      </View>

      {/* App Preferences */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionHeader}>Preferences</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Dark Theme Mode</Text>
              <Text style={styles.settingSub}>Switch between dark and light themes</Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={() => { dispatch(toggleThemeMode()); }}
              color="#bb86fc"
            />
          </View>
        </Card.Content>
      </Card>

      {/* WhatsApp Cloud API Integration */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionHeader}>WhatsApp Cloud API Credentials</Text>
          
          <TextInput
            label="META ACCESS TOKEN"
            mode="outlined"
            secureTextEntry
            value={metaAccessToken}
            onChangeText={setMetaAccessToken}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
            placeholder="EAAT..."
          />
          <TextInput
            label="META PHONE NUMBER ID"
            mode="outlined"
            value={metaPhoneNumberId}
            onChangeText={setMetaPhoneNumberId}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
            placeholder="e.g. 102938..."
          />
          <TextInput
            label="WHATSAPP BUSINESS ACCOUNT ID"
            mode="outlined"
            value={metaBusinessId}
            onChangeText={setMetaBusinessId}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
            placeholder="e.g. 227932..."
          />
          <TextInput
            label="BUSINESS NAME"
            mode="outlined"
            value={businessName}
            onChangeText={setBusinessName}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
            placeholder="e.g. Assandh Road Pharmacy"
          />
          <TextInput
            label="SENDER PHONE NUMBER"
            mode="outlined"
            keyboardType="phone-pad"
            value={senderNumber}
            onChangeText={setSenderNumber}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
            placeholder="e.g. 919876543210"
          />

          <Button
            mode="contained"
            onPress={handleSaveConfig}
            loading={saving}
            disabled={saving || loading}
            style={styles.saveBtn}
            buttonColor="#bb86fc"
            textColor="#000"
            icon="content-save"
          >
            Save Credentials
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 16,
    paddingBottom: 40,
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
  card: {
    backgroundColor: '#1e1e1e',
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    fontSize: 14,
    color: '#bb86fc',
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#151515',
  },
  saveBtn: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 4,
  },
});

export default SettingsScreen;
