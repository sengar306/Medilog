import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiClient from '../../api/apiClient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

const forgotSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
});

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: forgotSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        // Mocking recovery trigger or calling actual backend recovery route if available
        Alert.alert(
          'Recovery Triggered',
          `An OTP code has been dispatched to ${values.email}. Please verify.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Otp', { username: values.email }),
            },
          ]
        );
      } catch (err: any) {
        Alert.alert('Error', 'Failed to request recovery. Please check connection.');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Password Recovery</Text>
        <Text style={styles.subtitle}>Enter your pharmacy email to receive a recovery OTP</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Email Address"
          mode="outlined"
          value={formik.values.email}
          onChangeText={formik.handleChange('email')}
          onBlur={formik.handleBlur('email')}
          error={formik.touched.email && !!formik.errors.email}
          style={styles.input}
          outlineColor="#333"
          activeOutlineColor="#bb86fc"
          textColor="#fff"
        />
        {formik.touched.email && formik.errors.email && (
          <HelperText type="error" visible={true}>
            {formik.errors.email}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={() => formik.handleSubmit()}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          buttonColor="#bb86fc"
        >
          Send OTP Code
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          textColor="#bb86fc"
          style={styles.backBtn}
        >
          Back to Login
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
    marginBottom: 10,
    backgroundColor: '#1e1e1e',
  },
  btn: {
    marginTop: 20,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backBtn: {
    marginTop: 10,
  },
});

export default ForgotPasswordScreen;
