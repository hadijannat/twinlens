/**
 * Registry Types
 * Types for AAS Registry/Repository integration
 */

/**
 * Registry connection configuration
 */
export interface RegistryConfig {
  id: string;
  name: string;
  type: 'basyx' | 'aasx-server' | 'generic';
  baseUrl: string;
  authType?: 'none' | 'bearer' | 'basic';
  authToken?: string;
  username?: string;
  password?: string;
}

/**
 * Endpoint descriptor for shell access
 */
export interface EndpointDescriptor {
  href: string;
  interface: string;
  protocolInformation?: {
    endpointProtocol?: string;
    endpointProtocolVersion?: string;
  };
}

/**
 * Asset Administration Shell descriptor from registry
 */
export interface ShellDescriptor {
  id: string;
  idShort?: string;
  description?: string;
  assetKind?: 'Instance' | 'Type';
  globalAssetId?: string;
  endpoints: EndpointDescriptor[];
}

/**
 * Submodel descriptor from registry
 */
export interface SubmodelDescriptor {
  id: string;
  idShort?: string;
  semanticId?: string;
  endpoints: EndpointDescriptor[];
}

/**
 * Search result from registry queries
 */
export interface RegistrySearchResult {
  shells: ShellDescriptor[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * Registry connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Registry error with HTTP status
 */
export class RegistryError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}
