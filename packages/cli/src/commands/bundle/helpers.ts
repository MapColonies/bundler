import { RepositoryId } from '@bundler/github';
import { MAX_DELIMITER_OCCURRENCES, NAME_TO_REF_DELIMITER, OWNER_TO_NAME_DELIMITER } from "./constants";

export const isRepoValid = (repoStr: string): boolean => {
  return ![OWNER_TO_NAME_DELIMITER, NAME_TO_REF_DELIMITER].some((delimiter) => repoStr.split(delimiter).length > MAX_DELIMITER_OCCURRENCES + 1);
};

// TODO: export default branch and owner consts
export const repoStrToRepoId = (repo: string): RepositoryId => {
  const [ownerAndName, ref] = repo.split(NAME_TO_REF_DELIMITER);
  const [name, owner] = ownerAndName.split(OWNER_TO_NAME_DELIMITER).reverse();
  return { owner: (owner as string | undefined) ?? 'MapColonies', name, ref: (ref as string | undefined) ?? 'master' };
};
