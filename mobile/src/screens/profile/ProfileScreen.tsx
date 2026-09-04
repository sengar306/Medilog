import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { updateStoreProfile } from '../../redux/slices/authSlice';
import apiClient from '../../api/apiClient';

export const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const dispatch = useDispatch();
  const profile = useSelector((state: RootState) => state.auth.storeProfile);

  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [stateName, setStateName] = useState('Haryana');
  const [stateCode, setStateCode] = useState('06');
  const [saving, setSaving] = useState(false);

  // Load values on mount
  useEffect(() => {
    const fetchRemoteSettings = async () => {
      try {
        const res = await apiClient.get('/whatsapp/config');
        if (res.data && res.data.data) {
          const config = res.data.data;
          setStoreName(config.businessName || '');
          if (config.pdfConfig) {
            setAddress(config.pdfConfig.address || '');
            setPhone(config.pdfConfig.phone || '');
            setEmail(config.pdfConfig.email || '');
            setGstNumber(config.pdfConfig.gstNumber || '');
            setStateName(config.pdfConfig.stateName || 'Haryana');
            setStateCode(config.pdfConfig.stateCode || '06');
          }
        }
      } catch (err) {
        console.log('Failed to fetch remote settings, using local redux config:', err);
        if (profile) {
          setStoreName(profile.storeName || '');
          setAddress(profile.address || '');
          setPhone(profile.phone || '');
          setEmail(profile.email || '');
          setGstNumber(profile.gstNumber || '');
          setStateName((profile as any).stateName || 'Haryana');
          setStateCode((profile as any).stateCode || '06');
        }
      }
    };
    fetchRemoteSettings();
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update local Redux state
      dispatch(updateStoreProfile({
        storeName,
        address,
        phone,
        email,
        gstNumber,
        stateName,
        stateCode
      } as any));

      // 2. Persist to backend database settings
      const payload = {
        businessName: storeName,
        pdfConfig: {
          gstNumber,
          address,
          email,
          phone,
          stateName,
          stateCode
        }
      };
      await apiClient.post('/whatsapp/config', payload);

      Alert.alert('Success', 'Store profile details saved successfully.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Save Error', err.response?.data?.message || 'Failed to sync settings to server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>🏪 Store Profile & PDF settings</Title>
        <Text style={styles.subtitle}>Configure pharmacy business details, billing address, state codes, and GSTIN header settings</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionHeader}>Business Details</Text>
          
          <TextInput
            label="Pharmacy Store Name"
            mode="outlined"
            value={storeName}
            onChangeText={setStoreName}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
          />

          <TextInput
            label="Store Address"
            mode="outlined"
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
          />

          <TextInput
            label="Contact Phone"
            mode="outlined"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
          />

          <TextInput
            label="Contact Email"
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
            label="GSTIN Number"
            mode="outlined"
            value={gstNumber}
            onChangeText={setGstNumber}
            style={styles.input}
            activeOutlineColor="#bb86fc"
            outlineColor="#333"
            textColor="#fff"
            autoCapitalize="characters"
          />

          <View style={styles.row}>
            <TextInput
              label="State Name"
              mode="outlined"
              value={stateName}
              onChangeText={setStateName}
              style={[styles.input, { flex: 1.5, marginRight: 10 }]}
              activeOutlineColor="#bb86fc"
              outlineColor="#333"
              textColor="#fff"
            />
            <TextInput
              label="State Code"
              mode="outlined"
              keyboardType="numeric"
              value={stateCode}
              onChangeText={setStateCode}
              style={[styles.input, { flex: 1 }]}
              activeOutlineColor="#bb86fc"
              outlineColor="#333"
              textColor="#fff"
            />
          </View>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveBtn}
            buttonColor="#bb86fc"
            textColor="#000"
            icon="content-save"
          >
            Update Profile
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            textColor="#bb86fc"
            style={styles.backBtn}
          >
            Go Back
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
  input: {
    marginBottom: 16,
    backgroundColor: '#151515',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtn: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 4,
  },
  backBtn: {
    marginTop: 10,
  },
});

export default ProfileScreen;
