/* eslint-disable @typescript-eslint/naming-convention */ // octokit uses snake_case
import { Octokit } from '@octokit/rest';
import { OctokitOptions } from '@octokit/core/dist-types/types';
import { ILogger } from '@bundler/common';
import { GITHUB_ORG } from '@bundler/common';
import { IGithubClient, RepositoryFilter, RepositoryId } from './interfaces';
import { GithubAsset, GithubRepository, MediaType, RepositoryType } from './types';
import { GITHUB_API_URL, GITHUB_MAX_PAGINATION_LIMIT } from './constants';

type GithubClientOptions = OctokitOptions & { logger?: ILogger };

const DEFAULT_OPTIONS: GithubClientOptions = { baseUrl: GITHUB_API_URL };

const filterRepositories = (repositories: GithubRepository[], filter: RepositoryFilter): GithubRepository[] => {
  const { topics, archived } = filter;
  let filtered: GithubRepository[] = repositories;

  if (topics) {
    filtered = repositories.filter((repo) => repo.topics?.some((topic) => topics.includes(topic)));
  }

  if (archived !== undefined) {
    filtered = filtered.filter((repo) => repo.archived === archived);
  }

  return filtered;
};

export class GithubClient implements IGithubClient {
  private readonly _octokit: Octokit;
  private readonly logger: ILogger | undefined;

  public constructor(options: GithubClientOptions = DEFAULT_OPTIONS) {
    this.logger = options.logger;

    if (this.logger) {
      options.log = {
        debug: this.logger.debug.bind(this.logger),
        info: this.logger.info.bind(this.logger),
        warn: this.logger.warn.bind(this.logger),
        error: this.logger.error.bind(this.logger),
      };
    }

    this._octokit = new Octokit(options);
  }

  public async downloadRepository(id: Required<RepositoryId>, mediaType: MediaType = 'tarball'): Promise<ArrayBuffer> {
    this.logger?.debug({ msg: 'downloading repository', id, mediaType });

    const downloadObj = { owner: id.owner, repo: id.name, ref: id.ref };
    const downloadArchiveFunc =
      mediaType === 'tarball' ? this._octokit.rest.repos.downloadTarballArchive : this._octokit.rest.repos.downloadZipballArchive;

    const res = await downloadArchiveFunc(downloadObj);

    return res.data as ArrayBuffer;
  }

  public async listRepositories(org: string, type?: RepositoryType, filter?: RepositoryFilter): Promise<GithubRepository[]> {
    this.logger?.debug({ msg: 'listing repositories', org, type, filter });

    const repositories = (await this._octokit.rest.repos.listForOrg({ org, type })).data;

    return filter ? filterRepositories(repositories, filter) : repositories;
  }

  public async *listRepositoriesGenerator(
    org: string,
    type?: RepositoryType,
    filter?: RepositoryFilter,
    perPage = GITHUB_MAX_PAGINATION_LIMIT
  ): AsyncGenerator<GithubRepository[]> {
    this.logger?.debug({ msg: 'listing repositories', org, type, filter });

    for await (const response of this._octokit.paginate.iterator('GET /orgs/{org}/repos', { org, type, per_page: perPage })) {
      yield filter ? filterRepositories(response.data, filter) : response.data;
    }

    yield [];
  }

  public async listAssets(id: Required<RepositoryId>): Promise<GithubAsset[]> {
    this.logger?.debug({ msg: 'listing assets', id });

    const releases = await this._octokit.rest.repos.listReleases({ owner: id.owner, repo: id.name });

    const release = releases.data.find((r) => r.tag_name === id.ref);

    if (!release) {
      this.logger?.error({ msg: 'could not list assets due to release not found error', id });
      throw new Error(`No release found for ${id.owner}/${id.name} with tag ${id.ref}`);
    }

    const assets = await this._octokit.rest.repos.listReleaseAssets({
      owner: id.owner,
      repo: id.name,
      release_id: release.id,
    });

    return assets.data;
  }

  public async ping(): Promise<void> {
    this.logger?.debug({ msg: 'pinging' });

    await this._octokit.rest.orgs.get({
      org: GITHUB_ORG,
    });
  }
}
