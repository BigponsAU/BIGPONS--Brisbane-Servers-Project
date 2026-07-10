export interface StoredWebAuthnCredential {
  id: string;
  userId: string;
  /** Account email at registration — used to rebind after user-id changes. */
  email: string | null;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}
