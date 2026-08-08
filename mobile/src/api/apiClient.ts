import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production backend on Render
export const BASE_URL = 'https://medilog-dza5.onrender.com';

const apiClient = axios.create({
  baseURL: `${BASE_URL}`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Token Interceptor
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Failed to get token from storage', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for Token Expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Simple mock refresh token or redirect
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
          if (res.data?.token) {
            await AsyncStorage.setItem('token', res.data.token);
            originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshErr) {
        console.error('Session expired, logging out', refreshErr);
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
