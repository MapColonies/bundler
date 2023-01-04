import { Octokit } from '@octokit/rest';
import { GITHUB_API_URL, GITHUB_AUTH_TOKEN, GITHUB_MAX_PAGINATION_LIMIT } from './constants';
import { GithubRepository, MediaType, RepositoryId, RepositoryType } from './types';

const octokit = new Octokit({ baseUrl: GITHUB_API_URL, auth: GITHUB_AUTH_TOKEN });

interface RepositoryFilter {
  topics?: string[];
}

export const getOrgRepositories = async (org: string, type?: RepositoryType, filter?: RepositoryFilter): Promise<GithubRepository[]> => {
  const repositories: GithubRepository[] = [];

  // eslint-disable-next-line @typescript-eslint/naming-convention
  for await (const response of octokit.paginate.iterator('GET /orgs/{org}/repos', { org, type, per_page: GITHUB_MAX_PAGINATION_LIMIT })) {
    repositories.push(...response.data);
  }

  if (!filter) {
    return repositories;
  }

  return filterRepositories(repositories, filter);
};

export const filterRepositories = (repositories: GithubRepository[], filter: RepositoryFilter): GithubRepository[] => {
  const { topics } = filter;

  const filtered = repositories.filter((repo: GithubRepository) => repo.topics?.some((topic: string) => topics?.includes(topic)));

  return filtered;
};

export const downloadRepository = async (id: Required<RepositoryId>, mediaType: MediaType = 'tarball'): Promise<ArrayBuffer> => {
  const downloadObj = { owner: id.owner, repo: id.name, ref: id.ref };
  const downloadArchiveFunc = mediaType === 'tarball' ? octokit.rest.repos.downloadTarballArchive : octokit.rest.repos.downloadZipballArchive;

  const res = await downloadArchiveFunc(downloadObj);

  return res.data as ArrayBuffer;
};

// export const stringifyRepositoryId = (id: RepositoryId): string => {
//   return `${id.owner ?? GITHUB_ORG}-${id.name}-${id.ref ?? DEFAULT_BRANCH}`;
// };
