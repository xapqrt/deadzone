import { useState, useEffect } from 'react';
import { NetworkService } from '../services/network';
import { NetworkStatus } from '../types';

export const useOnlineStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    const initializeNetworkStatus = async () => {
      const status = await NetworkService.getCurrentStatus();
      setNetworkStatus(status);
    };

    const unsubscribe = NetworkService.addListener((status: NetworkStatus) => {
      setNetworkStatus(status);
    });

    initializeNetworkStatus();

    return unsubscribe;
  }, []);

  return {
    isOnline: networkStatus.isConnected && networkStatus.isInternetReachable,
    isConnected: networkStatus.isConnected,
    isInternetReachable: networkStatus.isInternetReachable,
    connectionType: networkStatus.type,
    networkStatus,
  };
};
