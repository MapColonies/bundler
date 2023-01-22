import pino from 'pino';
import { GithubClient } from "../../src";

const downloadTarballArchiveMock = jest.fn();
const downloadZipballArchiveMock = jest.fn();

jest.mock('@octokit/rest', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Octokit: jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            downloadTarballArchive: downloadTarballArchiveMock,
            downloadZipballArchive: downloadZipballArchiveMock
          }
        }
      }
    })
  }
});

describe('GithubClient', () => {
  let client: GithubClient

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
      const { name, ...rest } = repositoryId;

      await expect(promise).resolves.toBe(buffer);
      expect(downloadTarballArchiveMock).toHaveBeenCalledTimes(1);
      expect(downloadZipballArchiveMock).not.toHaveBeenCalled();
      expect(downloadTarballArchiveMock).toHaveBeenCalledWith({ ...rest, repo: name });
    });

    it('should download a zipball archive', async () => {
      const buffer = Buffer.from('test');
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      downloadZipballArchiveMock.mockResolvedValue({ data: buffer });

      const promise = client.downloadRepository(repositoryId, 'zipball');
      const { name, ...rest } = repositoryId;

      await expect(promise).resolves.toBe(buffer);
      expect(downloadZipballArchiveMock).toHaveBeenCalledTimes(1);
      expect(downloadTarballArchiveMock).not.toHaveBeenCalled();
      expect(downloadZipballArchiveMock).toHaveBeenCalledWith({ ...rest, repo: name });
    });

    it('should download a tarball archive by default', async () => {
      const buffer = Buffer.from('test');
      const repositoryId = { owner: 'owner', name: 'name', ref: 'ref' };
      downloadTarballArchiveMock.mockResolvedValue({ data: buffer });

      const promise = client.downloadRepository(repositoryId);
      const { name, ...rest } = repositoryId;

      await expect(promise).resolves.toBe(buffer);
      expect(downloadTarballArchiveMock).toHaveBeenCalledTimes(1);
      expect(downloadZipballArchiveMock).not.toHaveBeenCalled();
      expect(downloadTarballArchiveMock).toHaveBeenCalledWith({ ...rest, repo: name });
    });
  })
});
