import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

export const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [storeName, setStoreName] = useState('Assandh Road Pharmacy');
  const [address, setAddress] = useState('124, Assandh Road, Panipat, Haryana');
  const [phone, setPhone] = useState('+91 92192 76632');
  const [email, setEmail] = useState('contact@assandhpharmacy.com');
  const [gstNumber, setGstNumber] = useState('06AAAAA1111A1Z1');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Success', 'Store profile details saved successfully.');
    }, 1000);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>🏪 Store Profile</Title>
        <Text style={styles.subtitle}>Configure pharmacy business details, billing address, and GSTIN code</Text>
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
