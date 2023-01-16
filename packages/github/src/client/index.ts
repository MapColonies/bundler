/* eslint-disable @typescript-eslint/naming-convention */ // octokit uses snake_case
import { Octokit } from '@octokit/rest';
import { GITHUB_ORG } from '@bundler/core';
import { IGithubClient, RepositoryFilter, RepositoryId } from './interfaces';
import { GithubAsset, GithubRepository, MediaType, RepositoryType } from './types';
import { GITHUB_API_URL, GITHUB_MAX_PAGINATION_LIMIT } from './constants';

// TODO: fix type on ctor
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
type GithubClientOptions = ConstructorParameters<typeof Octokit>[0];

const DEFAULT_OPTIONS: GithubClientOptions = { baseUrl: GITHUB_API_URL };

const filterRepositories = (repositories: GithubRepository[], filter: RepositoryFilter): GithubRepository[] => {
  const { topics } = filter;

  const filtered = repositories.filter((repo: GithubRepository) => repo.topics?.some((topic: string) => topics?.includes(topic)));

  return filtered;
};

// TODO: add logger functionality and maybe verbosity
export class GithubClient implements IGithubClient {
  private readonly _octokit: Octokit;

  public constructor(options: GithubClientOptions = DEFAULT_OPTIONS) {
    this._octokit = new Octokit(options);
  }

  public async downloadRepository(id: Required<RepositoryId>, mediaType?: MediaType): Promise<ArrayBuffer> {
    const downloadObj = { owner: id.owner, repo: id.name, ref: id.ref };
    const downloadArchiveFunc =
      mediaType === 'tarball' ? this._octokit.rest.repos.downloadTarballArchive : this._octokit.rest.repos.downloadZipballArchive;

    const res = await downloadArchiveFunc(downloadObj);

    return res.data as ArrayBuffer;
  }

  public async listRepositories(org: string, type?: RepositoryType, filter?: RepositoryFilter): Promise<GithubRepository[]> {
    const repositories: GithubRepository[] = [];

    for await (const response of this._octokit.paginate.iterator('GET /orgs/{org}/repos', { org, type, per_page: GITHUB_MAX_PAGINATION_LIMIT })) {
      repositories.push(...response.data);
    }

    return filter ? filterRepositories(repositories, filter) : repositories;
  }

  public async *listRepositoriesGenerator(
    org: string,
    type?: RepositoryType,
    filter?: RepositoryFilter,
    perPage = GITHUB_MAX_PAGINATION_LIMIT
  ): AsyncGenerator<GithubRepository[]> {
    for await (const response of this._octokit.paginate.iterator('GET /orgs/{org}/repos', { org, type, per_page: perPage })) {
      yield filter ? filterRepositories(response.data, filter) : response.data;
    }

    yield [];
  }

  public async listAssets(id: Required<RepositoryId>): Promise<GithubAsset[]> {
    const releases = await this._octokit.rest.repos.listReleases({ owner: id.owner, repo: id.name });

    const release = releases.data.find((r) => r.tag_name === id.ref);

    if (!release) {
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
    await this._octokit.rest.orgs.get({
      org: GITHUB_ORG,
    });
  }
}
