import { Octokit } from '@octokit/rest';
import { ArrayElement, PropType } from '../common/types';

export type RepoType = 'all' | 'public' | 'private' | 'forks' | 'sources' | 'member' | 'internal';

export type GithubRepository = ArrayElement<PropType<Awaited<ReturnType<Octokit['rest']['repos']['listForOrg']>>, 'data'>>;

export type MediaType = 'tarball' | 'zipball';
