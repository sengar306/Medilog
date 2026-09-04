import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface StoreProfile {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'User' | 'Cashier';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isBiometricEnabled: boolean;
  themeMode: 'light' | 'dark';
  storeProfile: StoreProfile;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isBiometricEnabled: false,
  themeMode: 'dark',
  storeProfile: {
    storeName: 'Assandh Road Pharmacy',
    address: '124, Assandh Road, Panipat, Haryana',
    phone: '+91 92192 76632',
    email: 'contact@assandhpharmacy.com',
    gstNumber: '06AAAAA1111A1Z1',
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.isBiometricEnabled = action.payload;
    },
    toggleThemeMode: (state) => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
    },
    updateStoreProfile: (state, action: PayloadAction<StoreProfile>) => {
      state.storeProfile = action.payload;
    },
  },
});

export const { setCredentials, logout, setBiometricEnabled, toggleThemeMode, updateStoreProfile } =
  authSlice.actions;

export default authSlice.reducer;
