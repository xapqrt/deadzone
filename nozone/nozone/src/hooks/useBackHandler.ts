import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export const useBackHandler = (handler: () => boolean) => {
  useEffect(() => {
    const backAction = () => {
      return handler();
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [handler]);
};
