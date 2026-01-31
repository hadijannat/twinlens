/**
 * BaSyx Registry Client
 * Implementation for Eclipse BaSyx AAS Registry/Repository API
 */

import type { AASEnvironment, Submodel, AssetAdministrationShell } from '@shared/types';
import type { RegistryConfig, RegistrySearchResult, ShellDescriptor, SubmodelDescriptor, EndpointDescriptor } from './types';
import { RegistryClient } from './client';
import { RegistryError } from './types';

/**
 * BaSyx API response types
 */
interface BaSyxShellResponse {
  id: string;
  idShort?: string;
  description?: Array<{ language: string; text: string }>;
  assetInformation?: {
    assetKind?: string;
    globalAssetId?: string;
  };
  submodelDescriptors?: BaSyxSubmodelDescriptor[];
  endpoints?: BaSyxEndpoint[];
}

interface BaSyxSubmodelDescriptor {
  id: string;
  idShort?: string;
  semanticId?: { keys?: Array<{ value: string }> };
  endpoints?: BaSyxEndpoint[];
}

interface BaSyxEndpoint {
  interface: string;
  protocolInformation?: {
    href?: string;
    endpointProtocol?: string;
    endpointProtocolVersion?: string;
  };
}

interface BaSyxPaginatedResponse<T> {
  result: T[];
  paging_metadata?: {
    cursor?: string;
  };
}

/**
 * BaSyx Registry/Repository Client
 */
export class BaSyxClient extends RegistryClient {
  constructor(config: RegistryConfig) {
    super(config);
  }

  /**
   * Convert BaSyx endpoint format to our format
   */
  private convertEndpoint(endpoint: BaSyxEndpoint): EndpointDescriptor {
    return {
      href: endpoint.protocolInformation?.href || '',
      interface: endpoint.interface,
      protocolInformation: endpoint.protocolInformation ? {
        endpointProtocol: endpoint.protocolInformation.endpointProtocol,
        endpointProtocolVersion: endpoint.protocolInformation.endpointProtocolVersion,
      } : undefined,
    };
  }

  /**
   * Convert BaSyx shell response to our descriptor format
   */
  private convertShellDescriptor(shell: BaSyxShellResponse): ShellDescriptor {
    return {
      id: shell.id,
      idShort: shell.idShort,
      description: shell.description?.[0]?.text,
      assetKind: shell.assetInformation?.assetKind as 'Instance' | 'Type' | undefined,
      globalAssetId: shell.assetInformation?.globalAssetId,
      endpoints: (shell.endpoints || []).map(e => this.convertEndpoint(e)),
    };
  }

  /**
   * Convert BaSyx submodel descriptor to our format
   */
  private convertSubmodelDescriptor(sm: BaSyxSubmodelDescriptor): SubmodelDescriptor {
    return {
      id: sm.id,
      idShort: sm.idShort,
      semanticId: sm.semanticId?.keys?.[0]?.value,
      endpoints: (sm.endpoints || []).map(e => this.convertEndpoint(e)),
    };
  }

  /**
   * Test connection to BaSyx registry
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list shells with limit 1 to test connectivity
      await this.fetch<BaSyxPaginatedResponse<BaSyxShellResponse>>('/shell-descriptors?limit=1');
      return true;
    } catch (error) {
      if (error instanceof RegistryError && error.status === 0) {
        // Network error
        return false;
      }
      // Other errors (401, 403, etc.) still mean we connected
      return error instanceof RegistryError && error.status > 0;
    }
  }

  /**
   * List all shells from registry
   */
  async listShells(limit = 50, cursor?: string): Promise<RegistrySearchResult> {
    let path = `/shell-descriptors?limit=${limit}`;
    if (cursor) {
      path += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const response = await this.fetch<BaSyxPaginatedResponse<BaSyxShellResponse>>(path);

    return {
      shells: response.result.map(s => this.convertShellDescriptor(s)),
      cursor: response.paging_metadata?.cursor,
      hasMore: !!response.paging_metadata?.cursor,
    };
  }

  /**
   * Get a specific shell by ID
   */
  async getShell(shellId: string): Promise<ShellDescriptor> {
    const encodedId = encodeURIComponent(btoa(shellId));
    const response = await this.fetch<BaSyxShellResponse>(`/shell-descriptors/${encodedId}`);
    return this.convertShellDescriptor(response);
  }

  /**
   * Get full AAS environment for a shell
   * This fetches the shell and all its submodels
   */
  async getShellEnvironment(shellId: string): Promise<AASEnvironment> {
    const encodedId = encodeURIComponent(btoa(shellId));

    // Get the shell
    const shellResponse = await this.fetch<AssetAdministrationShell>(`/shells/${encodedId}`);

    // Get all submodels for this shell
    const submodelsResponse = await this.fetch<BaSyxPaginatedResponse<Submodel>>(
      `/shells/${encodedId}/submodels`
    );

    return {
      assetAdministrationShells: [shellResponse],
      submodels: submodelsResponse.result || [],
      conceptDescriptions: [],
    };
  }

  /**
   * Search shells by query string
   */
  async searchShells(query: string): Promise<RegistrySearchResult> {
    // BaSyx uses idShort filter for search
    const path = `/shell-descriptors?idShort=${encodeURIComponent(query)}`;

    try {
      const response = await this.fetch<BaSyxPaginatedResponse<BaSyxShellResponse>>(path);
      return {
        shells: response.result.map(s => this.convertShellDescriptor(s)),
        cursor: response.paging_metadata?.cursor,
        hasMore: !!response.paging_metadata?.cursor,
      };
    } catch (error) {
      // If search fails, fall back to listing all and filtering client-side
      if (error instanceof RegistryError && error.status === 400) {
        const allShells = await this.listShells(100);
        const filtered = allShells.shells.filter(s =>
          s.idShort?.toLowerCase().includes(query.toLowerCase()) ||
          s.id.toLowerCase().includes(query.toLowerCase())
        );
        return { shells: filtered, hasMore: false };
      }
      throw error;
    }
  }

  /**
   * List submodels for a shell
   */
  async listSubmodels(shellId: string): Promise<SubmodelDescriptor[]> {
    const encodedId = encodeURIComponent(btoa(shellId));
    const path = `/shell-descriptors/${encodedId}/submodel-descriptors`;

    const response = await this.fetch<BaSyxPaginatedResponse<BaSyxSubmodelDescriptor>>(path);
    return response.result.map(sm => this.convertSubmodelDescriptor(sm));
  }
}
