import { Octokit } from '@octokit/rest';

export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];

export type GithubRepository = ArrayElement<PropType<Awaited<ReturnType<Octokit['rest']['repos']['listForOrg']>>, 'data'>>;
export type GithubAsset = ArrayElement<PropType<Awaited<ReturnType<Octokit['rest']['repos']['listReleaseAssets']>>, 'data'>>;

export type RepositoryType = 'all' | 'public' | 'private' | 'forks' | 'sources' | 'member' | 'internal';

export type MediaType = 'tarball' | 'zipball';
