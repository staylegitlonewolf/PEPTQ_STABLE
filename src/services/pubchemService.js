// Manual Lite stub: PubChem lookups disabled to keep the build offline-only.

export class PubChemRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PubChemRequestError';
  }
}

export const isPubChemCooldownActive = () => true;
export const isPubChemTemporaryError = () => true;
export const getPubChemUserMessage = () => 'PubChem lookups are disabled in Manual Lite mode.';

export const fetchPubChemJson = async () => {
  throw new PubChemRequestError('PubChem lookups are disabled.');
};

export const fetchPubChemText = fetchPubChemJson;
