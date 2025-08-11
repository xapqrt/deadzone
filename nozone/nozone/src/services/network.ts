import NetInfo from '@react-native-community/netinfo';
import { NetworkStatus } from '../types';

export class NetworkService {
  private static listeners: Array<(status: NetworkStatus) => void> = [];
  private static currentStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
  };

  static async getCurrentStatus(): Promise<NetworkStatus> {
    try {
      const netInfo = await NetInfo.fetch();
      const status: NetworkStatus = {
        isConnected: netInfo.isConnected ?? false,
        isInternetReachable: netInfo.isInternetReachable,
        type: netInfo.type,
      };
      
      this.currentStatus = status;
      return status;
    } catch (error) {
      console.error('Error getting network status:', error);
      return {
        isConnected: false,
        isInternetReachable: null,
        type: null,
      };
    }
  }

  static startListening(): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
      const status: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      };

      const previousStatus = this.currentStatus;
      this.currentStatus = status;

      // Notify all listeners
      this.listeners.forEach(listener => {
        listener(status);
      });

      // Log status changes
      if (previousStatus.isConnected !== status.isConnected) {
        console.log(`Network status changed: ${status.isConnected ? 'Connected' : 'Disconnected'}`);
      }
    });

    return unsubscribe;
  }

  static addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current status
    listener(this.currentStatus);
    
    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  static isOnline(): boolean {
    return this.currentStatus.isConnected && 
           (this.currentStatus.isInternetReachable !== false);
  }

  static async waitForConnection(timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isOnline()) {
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeout);

      const cleanup = this.addListener((status) => {
        if (status.isConnected && status.isInternetReachable !== false) {
          clearTimeout(timeoutId);
          cleanup();
          resolve(true);
        }
      });
    });
  }

  static getConnectionType(): string {
    return this.currentStatus.type || 'unknown';
  }

  static isWifi(): boolean {
    return this.currentStatus.type === 'wifi';
  }

  static isCellular(): boolean {
    return this.currentStatus.type === 'cellular';
  }
}
