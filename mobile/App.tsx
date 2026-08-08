import React, { useEffect } from 'react';
import { Provider as ReduxProvider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider as PaperProvider } from 'react-native-paper';
import { store, persistor, RootState } from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { lightTheme, darkTheme } from './src/theme/theme';
import OfflineSyncService from './src/services/OfflineSyncService';

const MainApp = () => {
  const themeMode = useSelector((state: RootState) => state.auth.themeMode);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    // Initialize Offline Queue Synchronization Service
    OfflineSyncService.initialize();
  }, []);

  return (
    <PaperProvider theme={theme}>
      <AppNavigator />
    </PaperProvider>
  );
};

export default function App() {
  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <MainApp />
      </PersistGate>
    </ReduxProvider>
  );
}
