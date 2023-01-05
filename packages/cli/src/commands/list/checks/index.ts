import { CheckError } from '../../../common/errors';
import { CheckFunc } from '../../../wrappers/check';
import { ListArguments } from '../listFactory';

export const visibilityTokenImplicationCheck: CheckFunc<ListArguments> = (args) => {
  const { visibility, token } = args;

  if ((visibility === 'all' || visibility === 'private') && token === undefined) {
    throw new CheckError('visibility of type all or private requires a github access token', ['token', 'visibility'], { token, visibility });
  }

  return true;
};
