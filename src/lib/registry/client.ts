/**
 * Base Registry Client
 * Abstract client for AAS Registry/Repository APIs
 */

import type { AASEnvironment } from '@shared/types';
import type { RegistryConfig, RegistrySearchResult, ShellDescriptor, SubmodelDescriptor } from './types';
import { RegistryError } from './types';

/**
 * Abstract base class for registry clients
 * Implement this for specific registry types (BaSyx, AASX Server, etc.)
 */
export abstract class RegistryClient {
  protected config: RegistryConfig;

  constructor(config: RegistryConfig) {
    this.config = config;
  }

  /**
   * Get the registry configuration
   */
  getConfig(): RegistryConfig {
    return this.config;
  }

  /**
   * Perform authenticated fetch request
   */
  protected async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Add authentication headers
    if (this.config.authType === 'bearer' && this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    } else if (this.config.authType === 'basic' && this.config.username && this.config.password) {
      const credentials = btoa(`${this.config.username}:${this.config.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options?.headers },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new RegistryError(response.status, `Request failed: ${response.statusText}`, errorText);
      }

      return response.json();
    } catch (error) {
      if (error instanceof RegistryError) {
        throw error;
      }
      throw new RegistryError(0, `Network error: ${(error as Error).message}`);
    }
  }

  /**
   * Test connection to the registry
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * List all available shells
   */
  abstract listShells(limit?: number, cursor?: string): Promise<RegistrySearchResult>;

  /**
   * Get a specific shell by ID
   */
  abstract getShell(shellId: string): Promise<ShellDescriptor>;

  /**
   * Get the full AAS environment for a shell
   */
  abstract getShellEnvironment(shellId: string): Promise<AASEnvironment>;

  /**
   * Search shells by query string
   */
  abstract searchShells(query: string): Promise<RegistrySearchResult>;

  /**
   * List submodels for a shell
   */
  abstract listSubmodels(shellId: string): Promise<SubmodelDescriptor[]>;
}

/**
 * Create a registry client for the given config
 */
export function createRegistryClient(config: RegistryConfig): RegistryClient {
  // Import dynamically to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BaSyxClient } = require('./basyx');

  switch (config.type) {
    case 'basyx':
      return new BaSyxClient(config);
    case 'aasx-server':
    case 'generic':
    default:
      // Fall back to BaSyx for now, can add more implementations later
      return new BaSyxClient(config);
  }
}
