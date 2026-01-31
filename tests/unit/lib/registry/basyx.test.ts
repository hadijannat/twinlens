/**
 * BaSyx Registry Client Tests
 * Tests the BaSyx AAS Registry/Repository client implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaSyxClient } from '../../../../src/lib/registry/basyx';
import { RegistryError } from '../../../../src/lib/registry/types';
import type { RegistryConfig } from '../../../../src/lib/registry/types';

// Mock fetchWithPermission to avoid actual network calls
vi.mock('../../../../src/lib/permissions', () => ({
  fetchWithPermission: vi.fn(),
}));

import { fetchWithPermission } from '../../../../src/lib/permissions';
const mockedFetch = vi.mocked(fetchWithPermission);

describe('BaSyxClient', () => {
  const mockConfig: RegistryConfig = {
    id: 'test-registry',
    name: 'Test Registry',
    type: 'basyx',
    baseUrl: 'https://registry.example.com/api/v3.0',
    authType: 'none',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('testConnection', () => {
    it('returns true when API call succeeds', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [], paging_metadata: {} }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://registry.example.com/api/v3.0/shell-descriptors?limit=1',
        expect.any(Object)
      );
    });

    it('returns false on network error (status 0)', async () => {
      mockedFetch.mockRejectedValueOnce(new RegistryError(0, 'Network error'));

      const client = new BaSyxClient(mockConfig);
      const result = await client.testConnection();

      expect(result).toBe(false);
    });

    it('returns true on 401 (authentication required but server reachable)', async () => {
      mockedFetch.mockRejectedValueOnce(new RegistryError(401, 'Unauthorized'));

      const client = new BaSyxClient(mockConfig);
      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('returns true on 403 (forbidden but server reachable)', async () => {
      mockedFetch.mockRejectedValueOnce(new RegistryError(403, 'Forbidden'));

      const client = new BaSyxClient(mockConfig);
      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('returns true on 404 (not found but server reachable)', async () => {
      mockedFetch.mockRejectedValueOnce(new RegistryError(404, 'Not found'));

      const client = new BaSyxClient(mockConfig);
      const result = await client.testConnection();

      expect(result).toBe(true);
    });
  });

  describe('authentication', () => {
    it('adds Bearer token when authType is bearer', async () => {
      const configWithBearer: RegistryConfig = {
        ...mockConfig,
        authType: 'bearer',
        authToken: 'test-bearer-token',
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [], paging_metadata: {} }),
      } as Response);

      const client = new BaSyxClient(configWithBearer);
      await client.listShells();

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-bearer-token',
          }),
        })
      );
    });

    it('adds Basic auth when authType is basic', async () => {
      const configWithBasic: RegistryConfig = {
        ...mockConfig,
        authType: 'basic',
        username: 'testuser',
        password: 'testpass',
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [], paging_metadata: {} }),
      } as Response);

      const client = new BaSyxClient(configWithBasic);
      await client.listShells();

      const expectedCredentials = btoa('testuser:testpass');
      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Basic ${expectedCredentials}`,
          }),
        })
      );
    });

    it('does not add auth header when authType is none', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [], paging_metadata: {} }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      await client.listShells();

      const callArgs = mockedFetch.mock.calls[0]!;
      const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('listShells', () => {
    it('returns empty array when no shells exist', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [], paging_metadata: {} }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.listShells();

      expect(result.shells).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeUndefined();
    });

    it('parses shell descriptors correctly', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            {
              id: 'urn:test:shell:1',
              idShort: 'TestShell1',
              description: [{ language: 'en', text: 'A test shell' }],
              assetInformation: {
                assetKind: 'Instance',
                globalAssetId: 'urn:test:asset:1',
              },
              endpoints: [
                {
                  interface: 'AAS-3.0',
                  protocolInformation: {
                    href: 'https://example.com/shells/1',
                    endpointProtocol: 'HTTP',
                    endpointProtocolVersion: '1.1',
                  },
                },
              ],
            },
          ],
          paging_metadata: {},
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.listShells();

      expect(result.shells).toHaveLength(1);
      expect(result.shells[0]).toEqual({
        id: 'urn:test:shell:1',
        idShort: 'TestShell1',
        description: 'A test shell',
        assetKind: 'Instance',
        globalAssetId: 'urn:test:asset:1',
        endpoints: [
          {
            href: 'https://example.com/shells/1',
            interface: 'AAS-3.0',
            protocolInformation: {
              endpointProtocol: 'HTTP',
              endpointProtocolVersion: '1.1',
            },
          },
        ],
      });
    });

    it('handles pagination with cursor', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [{ id: 'shell-1' }],
          paging_metadata: { cursor: 'next-page-cursor' },
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.listShells(10);

      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe('next-page-cursor');
    });

    it('includes cursor in subsequent requests', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [], paging_metadata: {} }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      await client.listShells(50, 'my-cursor');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('cursor=my-cursor'),
        expect.any(Object)
      );
    });

    it('handles shells with missing optional fields', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            {
              id: 'urn:minimal:shell',
              // No idShort, description, assetInformation, or endpoints
            },
          ],
          paging_metadata: {},
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.listShells();

      expect(result.shells[0]).toEqual({
        id: 'urn:minimal:shell',
        idShort: undefined,
        description: undefined,
        assetKind: undefined,
        globalAssetId: undefined,
        endpoints: [],
      });
    });
  });

  describe('getShell', () => {
    it('fetches shell by base64-encoded ID', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'urn:test:shell:1',
          idShort: 'TestShell',
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.getShell('urn:test:shell:1');

      const expectedEncodedId = encodeURIComponent(btoa('urn:test:shell:1'));
      expect(mockedFetch).toHaveBeenCalledWith(
        `https://registry.example.com/api/v3.0/shell-descriptors/${expectedEncodedId}`,
        expect.any(Object)
      );
      expect(result.id).toBe('urn:test:shell:1');
    });
  });

  describe('getShellEnvironment', () => {
    it('fetches shell and submodels as environment', async () => {
      // First call: get shell
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'urn:test:shell:1',
          idShort: 'TestShell',
          assetInformation: {
            assetKind: 'Instance',
            globalAssetId: 'urn:test:asset:1',
          },
        }),
      } as Response);

      // Second call: get submodels
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            {
              id: 'urn:test:submodel:1',
              idShort: 'Nameplate',
            },
          ],
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const env = await client.getShellEnvironment('urn:test:shell:1');

      expect(env.assetAdministrationShells).toHaveLength(1);
      expect(env.assetAdministrationShells![0]!.id).toBe('urn:test:shell:1');
      expect(env.submodels).toHaveLength(1);
      expect(env.submodels![0]!.id).toBe('urn:test:submodel:1');
      expect(env.conceptDescriptions).toEqual([]);
    });
  });

  describe('searchShells', () => {
    it('searches by idShort filter', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [{ id: 'urn:test:shell:matched', idShort: 'MatchedShell' }],
          paging_metadata: {},
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      await client.searchShells('Matched');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('idShort=Matched'),
        expect.any(Object)
      );
    });

    it('falls back to client-side filtering on 400 error', async () => {
      // First call fails with 400
      mockedFetch.mockRejectedValueOnce(new RegistryError(400, 'Bad request'));

      // Second call: listShells fallback
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            { id: 'urn:test:shell:1', idShort: 'MatchedShell' },
            { id: 'urn:test:shell:2', idShort: 'OtherShell' },
          ],
          paging_metadata: {},
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.searchShells('Matched');

      expect(result.shells).toHaveLength(1);
      expect(result.shells[0]!.idShort).toBe('MatchedShell');
    });

    it('matches by id when idShort does not match', async () => {
      mockedFetch.mockRejectedValueOnce(new RegistryError(400, 'Bad request'));
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            { id: 'urn:matched:shell:1', idShort: 'SomethingElse' },
          ],
          paging_metadata: {},
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.searchShells('matched');

      expect(result.shells).toHaveLength(1);
    });
  });

  describe('listSubmodels', () => {
    it('lists submodels for a shell', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            {
              id: 'urn:test:submodel:1',
              idShort: 'Nameplate',
              semanticId: { keys: [{ value: 'https://admin-shell.io/idta/Nameplate/1/0' }] },
              endpoints: [
                {
                  interface: 'SUBMODEL-3.0',
                  protocolInformation: {
                    href: 'https://example.com/submodels/1',
                  },
                },
              ],
            },
          ],
        }),
      } as Response);

      const client = new BaSyxClient(mockConfig);
      const result = await client.listSubmodels('urn:test:shell:1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'urn:test:submodel:1',
        idShort: 'Nameplate',
        semanticId: 'https://admin-shell.io/idta/Nameplate/1/0',
        endpoints: [
          {
            href: 'https://example.com/submodels/1',
            interface: 'SUBMODEL-3.0',
            protocolInformation: {
              endpointProtocol: undefined,
              endpointProtocolVersion: undefined,
            },
          },
        ],
      });
    });
  });

  describe('error handling', () => {
    it('throws RegistryError on HTTP error', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error details',
      } as Response);

      const client = new BaSyxClient(mockConfig);

      await expect(client.listShells()).rejects.toThrow(RegistryError);
    });

    it('throws RegistryError with network error on fetch failure', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const client = new BaSyxClient(mockConfig);

      await expect(client.listShells()).rejects.toThrow('Network error');
    });

    it('preserves RegistryError when already thrown', async () => {
      const originalError = new RegistryError(403, 'Access denied', 'No permission');
      mockedFetch.mockRejectedValueOnce(originalError);

      const client = new BaSyxClient(mockConfig);

      try {
        await client.listShells();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(originalError);
        expect((error as RegistryError).status).toBe(403);
        expect((error as RegistryError).details).toBe('No permission');
      }
    });
  });

  describe('getConfig', () => {
    it('returns the configuration', () => {
      const client = new BaSyxClient(mockConfig);
      expect(client.getConfig()).toEqual(mockConfig);
    });
  });
});
