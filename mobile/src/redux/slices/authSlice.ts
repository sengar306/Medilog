import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

const initialState: AuthState = {
  user: null,
  token: null,
  isBiometricEnabled: false,
  themeMode: 'dark',
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
  },
});

export const { setCredentials, logout, setBiometricEnabled, toggleThemeMode } =
  authSlice.actions;

export default authSlice.reducer;
