import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface QueuedSale {
  id: string; // temporary offline ID
  customerName: string;
  customerPhone: string;
  items: Array<{
    medicineId: string;
    medicineName: string;
    quantity: number;
    rate: number;
    mrp: number;
    gstPercent: number;
  }>;
  discountAmount: number;
  paymentMode: string;
  createdAt: string;
}

interface SyncState {
  syncQueue: QueuedSale[];
  isOnline: boolean;
}

const initialState: SyncState = {
  syncQueue: [],
  isOnline: true,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    queueOfflineSale: (state, action: PayloadAction<QueuedSale>) => {
      state.syncQueue.push(action.payload);
    },
    removeSyncedSale: (state, action: PayloadAction<string>) => {
      state.syncQueue = state.syncQueue.filter((sale) => sale.id !== action.payload);
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    clearSyncQueue: (state) => {
      state.syncQueue = [];
    },
  },
});

export const { queueOfflineSale, removeSyncedSale, setOnlineStatus, clearSyncQueue } =
  syncSlice.actions;

export default syncSlice.reducer;
