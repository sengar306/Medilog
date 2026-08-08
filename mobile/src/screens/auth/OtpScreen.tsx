import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type OtpScreenRouteProp = RouteProp<RootStackParamList, 'Otp'>;
type OtpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Otp'>;

interface Props {
  route: OtpScreenRouteProp;
  navigation: OtpScreenNavigationProp;
}

export const OtpScreen: React.FC<Props> = ({ route, navigation }) => {
  const { username } = route.params;
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Mocking validation and password update
      Alert.alert(
        'Password Reset Successfully',
        'Your password has been changed. Please sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.replace('Login'),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Account</Text>
        <Text style={styles.subtitle}>
          Enter the 4-digit code sent to {username}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="4-Digit OTP Code"
          mode="outlined"
          keyboardType="number-pad"
          maxLength={4}
          value={otp}
          onChangeText={setOtp}
          style={styles.input}
          outlineColor="#333"
          activeOutlineColor="#bb86fc"
          textColor="#fff"
        />

        <TextInput
          label="New Password"
          mode="outlined"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          style={styles.input}
          outlineColor="#333"
          activeOutlineColor="#bb86fc"
          textColor="#fff"
        />

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          buttonColor="#bb86fc"
        >
          Verify & Reset Password
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#bb86fc',
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#1e1e1e',
  },
  btn: {
    marginTop: 20,
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default OtpScreen;
