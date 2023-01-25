/* eslint-disable @typescript-eslint/naming-convention */ // octokit uses snake_case
import pino from 'pino';
import { GithubRepository } from '../../dist';
import { GithubClient } from '../../src';

const downloadTarballArchiveMock = jest.fn();
const downloadZipballArchiveMock = jest.fn();
const listForOrgMock = jest.fn();
const paginateIteratorMock = jest.fn();
const listReleasesMock = jest.fn();
const listReleaseAssetsMock = jest.fn();
const getOrgMock = jest.fn();

jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            downloadTarballArchive: downloadTarballArchiveMock,
            downloadZipballArchive: downloadZipballArchiveMock,
            listForOrg: listForOrgMock,
            listReleases: listReleasesMock,
            listReleaseAssets: listReleaseAssetsMock,
          },
          orgs: {
            get: getOrgMock,
          },
        },
        paginate: {
          iterator: paginateIteratorMock,
        },
      };
    }),
  };
});

describe('GithubClient', () => {
  let client: GithubClient;

  beforeEach(function () {
    client = new GithubClient({ logger: pino({ enabled: false }) });
  });

  afterEach(function () {
    jest.clearAllMocks();
  });

  describe('#downloadRepository', () => {
    it('should download a tarball archive', async () => {
      const buffer = Buffer.from('test');
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      downloadTarballArchiveMock.mockResolvedValue({ data: buffer });

      const promise = client.downloadRepository(repositoryId, 'tarball');

      await expect(promise).resolves.toBe(buffer);
      expect(downloadTarballArchiveMock).toHaveBeenCalledTimes(1);
      expect(downloadZipballArchiveMock).not.toHaveBeenCalled();
      expect(downloadTarballArchiveMock).toHaveBeenCalledWith({ owner: repositoryId.owner, repo: repositoryId.name, ref: repositoryId.ref });
    });

    it('should download a zipball archive', async () => {
      const buffer = Buffer.from('test');
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      downloadZipballArchiveMock.mockResolvedValue({ data: buffer });

      const promise = client.downloadRepository(repositoryId, 'zipball');

      await expect(promise).resolves.toBe(buffer);
      expect(downloadZipballArchiveMock).toHaveBeenCalledTimes(1);
      expect(downloadTarballArchiveMock).not.toHaveBeenCalled();
      expect(downloadZipballArchiveMock).toHaveBeenCalledWith({ owner: repositoryId.owner, repo: repositoryId.name, ref: repositoryId.ref });
    });

    it('should download a tarball archive by default', async () => {
      const buffer = Buffer.from('test');
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      downloadTarballArchiveMock.mockResolvedValue({ data: buffer });

      const promise = client.downloadRepository(repositoryId);

      await expect(promise).resolves.toBe(buffer);
      expect(downloadTarballArchiveMock).toHaveBeenCalledTimes(1);
      expect(downloadZipballArchiveMock).not.toHaveBeenCalled();
      expect(downloadTarballArchiveMock).toHaveBeenCalledWith({ owner: repositoryId.owner, repo: repositoryId.name, ref: repositoryId.ref });
    });

    it('should throw if tar download function throws', async () => {
      const error = new Error();
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      downloadTarballArchiveMock.mockRejectedValue(error);

      const promise = client.downloadRepository(repositoryId, 'tarball');

      await expect(promise).rejects.toThrow(error);
      expect(downloadTarballArchiveMock).toHaveBeenCalledTimes(1);
      expect(downloadZipballArchiveMock).not.toHaveBeenCalled();
      expect(downloadTarballArchiveMock).toHaveBeenCalledWith({ owner: repositoryId.owner, repo: repositoryId.name, ref: repositoryId.ref });
    });

    it('should throw if zip download function throws', async () => {
      const error = new Error();
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      downloadZipballArchiveMock.mockRejectedValue(error);

      const promise = client.downloadRepository(repositoryId, 'zipball');

      await expect(promise).rejects.toThrow(error);
      expect(downloadZipballArchiveMock).toHaveBeenCalledTimes(1);
      expect(downloadTarballArchiveMock).not.toHaveBeenCalled();
      expect(downloadZipballArchiveMock).toHaveBeenCalledWith({ owner: repositoryId.owner, repo: repositoryId.name, ref: repositoryId.ref });
    });
  });

  describe('#listRepositories', () => {
    it('should return empty array if no repos found', async () => {
      listForOrgMock.mockResolvedValue({ data: [] });

      const promise = client.listRepositories('org');

      await expect(promise).resolves.toMatchObject([]);
      expect(listForOrgMock).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no repos found when filter provided', async () => {
      listForOrgMock.mockResolvedValue({ data: [] });

      const promise = client.listRepositories('org', 'all', { archived: false, topics: ['t1', 't2'] });

      await expect(promise).resolves.toMatchObject([]);
      expect(listForOrgMock).toHaveBeenCalledTimes(1);
      expect(listForOrgMock).toHaveBeenCalledWith({ org: 'org', type: 'all' });
    });

    it('should filter out archived repos', async () => {
      const archivedRepo = { archived: true };
      const notArchivedRepo = { archived: false };
      listForOrgMock.mockResolvedValue({ data: [archivedRepo, notArchivedRepo] });

      const promise = client.listRepositories('org', 'all', { archived: false });

      await expect(promise).resolves.toMatchObject([notArchivedRepo]);
      expect(listForOrgMock).toHaveBeenCalledTimes(1);
      expect(listForOrgMock).toHaveBeenCalledWith({ org: 'org', type: 'all' });
    });

    it('should filter out non matching topics', async () => {
      const repo1 = { topics: ['t1'] };
      const repo2 = { topics: ['t2'] };
      const repo3 = { topics: ['t1', 't2'] };
      const repo4 = { topics: ['t3'] };
      listForOrgMock.mockResolvedValue({ data: [repo1, repo2, repo3, repo4] });

      const response = await client.listRepositories('org', 'all', { topics: ['t1', 't2'] });

      expect(response).toEqual(expect.arrayContaining([repo1, repo2, repo3]));
      expect(listForOrgMock).toHaveBeenCalledTimes(1);
      expect(listForOrgMock).toHaveBeenCalledWith({ org: 'org', type: 'all' });
    });

    it('should filter out non matching topics and archived flag', async () => {
      const repo1 = { topics: ['t1'], archived: false };
      const repo2 = { topics: ['t2'], archived: true };
      const repo3 = { topics: ['t1', 't2'], archived: false };
      const repo4 = { topics: ['t3'], archived: false };
      listForOrgMock.mockResolvedValue({ data: [repo1, repo2, repo3, repo4] });

      const response = await client.listRepositories('org', 'all', { topics: ['t1', 't2'], archived: false });

      expect(response).toEqual(expect.arrayContaining([repo1, repo3]));
      expect(listForOrgMock).toHaveBeenCalledTimes(1);
      expect(listForOrgMock).toHaveBeenCalledWith({ org: 'org', type: 'all' });
    });

    it('should return empty array response if all repos were filtered', async () => {
      const repo1 = { topics: ['t1'], archived: false };
      const repo2 = { topics: ['t2'], archived: true };
      const repo3 = { topics: ['t1', 't2'], archived: false };
      const repo4 = { topics: ['t3'], archived: false };
      listForOrgMock.mockResolvedValue({ data: [repo1, repo2, repo3, repo4] });

      const response = await client.listRepositories('org', 'all', { topics: ['t1'], archived: true });

      expect(response).toMatchObject([]);
      expect(listForOrgMock).toHaveBeenCalledTimes(1);
      expect(listForOrgMock).toHaveBeenCalledWith({ org: 'org', type: 'all' });
    });

    it('should reject if list for org function throws', async () => {
      const error = new Error();
      listForOrgMock.mockRejectedValue(error);

      const promise = client.listRepositories('org');

      await expect(promise).rejects.toThrow(error);
      expect(listForOrgMock).toHaveBeenCalledTimes(1);
      expect(listForOrgMock).toHaveBeenCalledWith({ org: 'org' });
    });
  });

  describe('#listRepositoriesGenerator', () => {
    it('should resolve with no data if none were returned', async () => {
      async function* func(): AsyncGenerator {
        yield await Promise.resolve({ data: [] });
      }

      paginateIteratorMock.mockReturnValue(func());

      const mockGenerator = client.listRepositoriesGenerator('org');
      const firstIter = await mockGenerator.next();
      const secondIter = await mockGenerator.next();

      expect(firstIter.value).toEqual([]);
      expect(secondIter.value).toEqual([]);
      expect(paginateIteratorMock).toHaveBeenCalledTimes(1);
    });

    it('should generate an async generator returning repositories when no filter is set', async () => {
      const first: Partial<GithubRepository> = { id: 1 };
      const second: Partial<GithubRepository> = { id: 2 };
      const third: Partial<GithubRepository> = { id: 3 };

      async function* func(): AsyncGenerator {
        yield await Promise.resolve({ data: [first, second] });
        yield await Promise.resolve({ data: [third] });
      }

      paginateIteratorMock.mockReturnValue(func());

      const mockGenerator = client.listRepositoriesGenerator('org');
      const firstIter = await mockGenerator.next();
      const secondIter = await mockGenerator.next();

      expect(firstIter.value).toEqual([first, second]);
      expect(secondIter.value).toEqual([third]);
      expect(paginateIteratorMock).toHaveBeenCalledTimes(1);
    });

    it('should generate an async generator returning non acrchived repositories', async () => {
      const first: Partial<GithubRepository> = { id: 1, archived: true };
      const second: Partial<GithubRepository> = { id: 2, archived: false };
      const third: Partial<GithubRepository> = { id: 3 };
      const fourth: Partial<GithubRepository> = { id: 3, archived: false };

      async function* func(): AsyncGenerator {
        yield await Promise.resolve({ data: [first, second] });
        yield await Promise.resolve({ data: [third] });
        yield await Promise.resolve({ data: [fourth] });
      }

      paginateIteratorMock.mockReturnValue(func());

      const mockGenerator = client.listRepositoriesGenerator('org', 'all', { archived: false });
      const firstIter = await mockGenerator.next();
      const secondIter = await mockGenerator.next();
      const thirdIter = await mockGenerator.next();

      expect(firstIter.value).toEqual([second]);
      expect(secondIter.value).toEqual([]);
      expect(thirdIter.value).toEqual([fourth]);
      expect(paginateIteratorMock).toHaveBeenCalledTimes(1);
    });

    it('should generate an async generator returning repositories filtered by topic', async () => {
      const first: Partial<GithubRepository> = { id: 1, topics: [] };
      const second: Partial<GithubRepository> = { id: 2, topics: ['t1'] };
      const third: Partial<GithubRepository> = { id: 3, topics: ['t1', 't2'] };
      const fourth: Partial<GithubRepository> = { id: 4, topics: ['t3'] };

      async function* func(): AsyncGenerator {
        yield await Promise.resolve({ data: [first, second] });
        yield await Promise.resolve({ data: [third] });
        yield await Promise.resolve({ data: [fourth] });
      }

      paginateIteratorMock.mockReturnValue(func());

      const mockGenerator = client.listRepositoriesGenerator('org', 'all', { topics: ['t1'] });
      const firstIter = await mockGenerator.next();
      const secondIter = await mockGenerator.next();
      const thirdIter = await mockGenerator.next();

      expect(firstIter.value).toEqual([second]);
      expect(secondIter.value).toEqual([third]);
      expect(thirdIter.value).toEqual([]);
      expect(paginateIteratorMock).toHaveBeenCalledTimes(1);
    });

    it('should generate an async generator returning repositories filtered by archived and topic', async () => {
      const first: Partial<GithubRepository> = { id: 1, topics: [] };
      const second: Partial<GithubRepository> = { id: 2, topics: ['t1'] };
      const third: Partial<GithubRepository> = { id: 3, topics: ['t1', 't2'], archived: true };
      const fourth: Partial<GithubRepository> = { id: 4, topics: ['t3'] };

      async function* func(): AsyncGenerator {
        yield await Promise.resolve({ data: [first, second] });
        yield await Promise.resolve({ data: [third] });
        yield await Promise.resolve({ data: [fourth] });
      }

      paginateIteratorMock.mockReturnValue(func());

      const mockGenerator = client.listRepositoriesGenerator('org', 'all', { archived: true, topics: ['t1'] });
      const firstIter = await mockGenerator.next();
      const secondIter = await mockGenerator.next();
      const thirdIter = await mockGenerator.next();

      expect(firstIter.value).toEqual([]);
      expect(secondIter.value).toEqual([third]);
      expect(thirdIter.value).toEqual([]);
      expect(paginateIteratorMock).toHaveBeenCalledTimes(1);
    });

    it('should reject if pagination rejects', async () => {
      const first: Partial<GithubRepository> = { id: 1, topics: ['t1'], archived: false };
      const error = new Error();

      async function* func(): AsyncGenerator {
        yield await Promise.resolve({ data: [first] });
        yield await Promise.reject(error);
      }

      paginateIteratorMock.mockReturnValue(func());

      const mockGenerator = client.listRepositoriesGenerator('org', 'all', { archived: false, topics: ['t1'] });
      const firstIter = await mockGenerator.next();

      expect(firstIter.value).toEqual([first]);
      await expect(mockGenerator.next()).rejects.toThrow(error);
      expect(paginateIteratorMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('#listAssets', () => {
    it.each([[[]], [[{ assetName: 'name1' }]], [[{ assetName: 'name1' }, { assetName: 'name2' }]]])(
      'should return the assets array of a release',
      async (assets: { assetName: string }[]) => {
        const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
        const release = { id: 'id', tag_name: 'ref' };
        listReleasesMock.mockResolvedValue({ data: [release] });
        listReleaseAssetsMock.mockResolvedValue({ data: assets });

        const promise = client.listAssets(repositoryId);

        await expect(promise).resolves.toMatchObject(assets);
        expect(listReleasesMock).toHaveBeenCalledTimes(1);
        expect(listReleasesMock).toHaveBeenCalledWith({ owner: repositoryId.owner, repo: repositoryId.name });
        expect(listReleaseAssetsMock).toHaveBeenCalledTimes(1);
        expect(listReleaseAssetsMock).toHaveBeenCalledWith({ owner: repositoryId.owner, repo: repositoryId.name, release_id: release.id });
      }
    );

    it.each([[[]], [[{ id: 'id', tag_name: 'otherRef' }]]])(
      'should return the assets array of a release',
      async (releases: { id: string; tag_name: string }[]) => {
        const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
        listReleasesMock.mockResolvedValue({ data: releases });

        const promise = client.listAssets(repositoryId);

        await expect(promise).rejects.toThrow(
          new Error(`No release found for ${repositoryId.owner}/${repositoryId.name} with tag ${repositoryId.ref}`)
        );
        expect(listReleasesMock).toHaveBeenCalledTimes(1);
        expect(listReleasesMock).toHaveBeenCalledWith({ owner: repositoryId.owner, repo: repositoryId.name });
        expect(listReleaseAssetsMock).toHaveBeenCalledTimes(0);
      }
    );

    it('should reject if list releases function throws', async () => {
      const error = new Error();
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      listReleasesMock.mockRejectedValue(error);

      const promise = client.listAssets(repositoryId);

      await expect(promise).rejects.toThrow(error);
      expect(listReleasesMock).toHaveBeenCalledTimes(1);
      expect(listReleaseAssetsMock).toHaveBeenCalledTimes(0);
    });

    it('should reject if list release assets function throws', async () => {
      const error = new Error();
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      const release = { id: 'id', tag_name: 'ref' };
      listReleasesMock.mockResolvedValue({ data: [release] });
      listReleaseAssetsMock.mockRejectedValue(error);

      const promise = client.listAssets(repositoryId);

      await expect(promise).rejects.toThrow(error);
      expect(listReleasesMock).toHaveBeenCalledTimes(1);
      expect(listReleaseAssetsMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('#ping', () => {
    it('should ping the git provider by getting the default organizaton', async () => {
      getOrgMock.mockResolvedValue(undefined);
      const promise = client.ping();

      await expect(promise).resolves.not.toThrow();
      expect(getOrgMock).toHaveBeenCalledTimes(1);
    });

    it('should throw if pinging the git provider throws', async () => {
      const error = new Error();
      getOrgMock.mockRejectedValue(error);

      const promise = client.ping();

      await expect(promise).rejects.toThrow(error);
      expect(getOrgMock).toHaveBeenCalledTimes(1);
    });
  });
});
