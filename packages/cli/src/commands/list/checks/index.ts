import { Arguments } from 'yargs';
import { IConfig } from '../../../config/configStore';
import { SERVICES } from '../../../common/constants';
import { CheckError } from '../../../common/errors';
import { CheckFuncFactory } from '../../../wrappers/check';
import { ListArguments } from '../listFactory';

export const visibilityTokenImplicationCheck: CheckFuncFactory<ListArguments> = (dependencyContainer) => {
  const check = (args: Arguments<ListArguments>): true => {
    const { visibility, token } = args;

    const configStore = dependencyContainer.resolve<IConfig>(SERVICES.CONFIG);

    const wasTokenProvided = token !== undefined || configStore.has('githubAccessToken');

    if ((visibility === 'all' || visibility === 'private') && !wasTokenProvided) {
      throw new CheckError('visibility of type all or private requires a github access token', ['token', 'visibility'], { token, visibility });
    }

    return true;
  };
  return check;
};
