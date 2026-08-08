import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Checkbox, HelperText } from 'react-native-paper';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../redux/slices/authSlice';
import apiClient from '../../api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const loginSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const formik = useFormik({
    initialValues: { username: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const response = await apiClient.post('/auth/login', {
          username: values.username,
          password: values.password,
        });

        if (response.data && response.data.token) {
          const { _id, username, email, role, token } = response.data;
          
          if (rememberMe) {
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify({ id: _id, username, email, role }));
          }

          dispatch(setCredentials({
            user: { id: _id, username, email, role },
            token,
          }));

          Alert.alert('Success', `Welcome back, ${username}!`);
        }
      } catch (err: any) {
        console.error(err);
        Alert.alert('Login Failed', err.response?.data?.message || 'Invalid username or password.');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MediLog</Text>
        <Text style={styles.subtitle}>Pharmacy Portal Sign In</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Username / Email"
          mode="outlined"
          value={formik.values.username}
          onChangeText={formik.handleChange('username')}
          onBlur={formik.handleBlur('username')}
          error={formik.touched.username && !!formik.errors.username}
          style={styles.input}
          outlineColor="#333"
          activeOutlineColor="#bb86fc"
          textColor="#fff"
        />
        {formik.touched.username && formik.errors.username && (
          <HelperText type="error" visible={true}>
            {formik.errors.username}
          </HelperText>
        )}

        <TextInput
          label="Password"
          mode="outlined"
          secureTextEntry={secureText}
          value={formik.values.password}
          onChangeText={formik.handleChange('password')}
          onBlur={formik.handleBlur('password')}
          error={formik.touched.password && !!formik.errors.password}
          right={
            <TextInput.Icon
              icon={secureText ? 'eye-off' : 'eye'}
              onPress={() => setSecureText(!secureText)}
            />
          }
          style={styles.input}
          outlineColor="#333"
          activeOutlineColor="#bb86fc"
          textColor="#fff"
        />
        {formik.touched.password && formik.errors.password && (
          <HelperText type="error" visible={true}>
            {formik.errors.password}
          </HelperText>
        )}

        <View style={styles.row}>
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
              color="#bb86fc"
            />
            <Text style={styles.label}>Remember Login</Text>
          </View>
          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            textColor="#bb86fc"
            compact
          >
            Forgot Password?
          </Button>
        </View>

        <Button
          mode="contained"
          onPress={() => formik.handleSubmit()}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          buttonColor="#bb86fc"
        >
          Sign In
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#bb86fc',
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 6,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#1e1e1e',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
  },
  btn: {
    marginTop: 20,
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default LoginScreen;
