import { useEffect, useState } from 'react';

const STORE_MODE_KEY = 'peptq_store_mode_v1';
const STORE_MODE_EVENT = 'peptq:store-mode-changed';

const normalizeMode = (value) => (String(value || '').trim().toUpperCase() === 'STOREOFF' ? 'STOREOFF' : 'STOREON');

const readStoreMode = () => {
  return 'STOREON';
};

const writeStoreMode = (mode) => {
  return normalizeMode(mode);
};

const ensureDebugCommands = () => {
  return;
};

export const useStoreDebugMode = () => {
  const [storeMode] = useState(() => readStoreMode());

  useEffect(() => {
    ensureDebugCommands();
  }, []);

  return {
    storeMode,
    isStoreOn: storeMode === 'STOREON',
    isStoreOff: storeMode === 'STOREOFF',
    setStoreOn: () => writeStoreMode('STOREON'),
    setStoreOff: () => writeStoreMode('STOREOFF'),
  };
};
