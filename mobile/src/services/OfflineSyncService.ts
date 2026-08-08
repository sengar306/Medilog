import NetInfo from '@react-native-community/netinfo';
import apiClient from '../api/apiClient';
import { store } from '../redux/store';
import { setOnlineStatus, removeSyncedSale, QueuedSale } from '../redux/slices/syncSlice';

export class OfflineSyncService {
  private static isSyncing = false;

  static initialize() {
    // Listen to network status changes
    NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && !!state.isInternetReachable;
      store.dispatch(setOnlineStatus(isOnline));

      if (isOnline) {
        this.triggerSync();
      }
    });
  }

  static async triggerSync() {
    if (this.isSyncing) return;
    const { syncQueue } = store.getState().sync;
    if (syncQueue.length === 0) return;

    this.isSyncing = true;
    console.log(`Starting synchronization of ${syncQueue.length} queued bills...`);

    for (const sale of syncQueue) {
      try {
        const payload = {
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          items: sale.items.map(item => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
          })),
          discountAmount: sale.discountAmount,
          paymentMode: sale.paymentMode,
        };

        const response = await apiClient.post('/sales', payload);
        if (response.status === 201) {
          console.log(`Successfully synchronized offline sale: ${sale.id}`);
          store.dispatch(removeSyncedSale(sale.id));
        }
      } catch (error) {
        console.error(`Failed to synchronize sale ${sale.id}:`, error);
        // Break to avoid hammering the server if it's down
        break;
      }
    }

    this.isSyncing = false;
  }
}
export default OfflineSyncService;
