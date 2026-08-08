import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/822/822143.png' }}
          style={styles.logo}
        />
        <Text style={styles.title}>MediLog</Text>
        <Text style={styles.tagline}>Smart Pharmacy Management</Text>
      </View>
      <ActivityIndicator size="small" color="#bb86fc" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    tintColor: '#bb86fc',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loader: {
    marginBottom: 20,
  },
});

export default SplashScreen;
