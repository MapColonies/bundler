import { DockerBuildArgs, DockerPullArgs, DockerSaveArgs, EnvOptions } from './interfaces';
import { CommanderOptions } from './commander';
import { spawnChildProcess, promisifyChildProcess } from '.';

enum Command {
  BUILD = 'build',
  SAVE = 'save',
  PULL = 'pull',
  VERSION = 'version',
}

export const DOCKER_EXEC = 'docker';

// TODO: improve passing commander options
export const dockerBuild = async (args: DockerBuildArgs & EnvOptions & CommanderOptions): Promise<void> => {
  const { dockerFile, image, path, useBuildkit } = args;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const envOptions = useBuildkit === true ? { DOCKER_BUILDKIT: '1' } : { DOCKER_BUILDKIT: '0' };

  const childProcess = spawnChildProcess(
    DOCKER_EXEC,
    Command.BUILD,
    ['-f', dockerFile, '-t', `${image.name}:${image.tag}`, path],
    envOptions,
    args.verbose,
    args.logger
  );

  const { exitCode, stderr } = await promisifyChildProcess(childProcess);

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.BUILD} failed with exit code ${exitCode ?? 'null'}`);
  }
};

export const dockerSave = async (args: DockerSaveArgs & CommanderOptions): Promise<void> => {
  const { image, registry, path } = args;

  const finalImageName = registry !== undefined ? `${registry}/${image.name}:${image.tag}` : `${image.name}:${image.tag}`;

  const childProcess = spawnChildProcess(DOCKER_EXEC, Command.SAVE, ['-o', path, finalImageName], undefined, args.verbose, args.logger);

  const { exitCode, stderr } = await promisifyChildProcess(childProcess);

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.SAVE} failed with exit code ${exitCode ?? 'null'}`);
  }
};

export const dockerPull = async (args: DockerPullArgs & CommanderOptions): Promise<void> => {
  const { registry, image } = args;

  const imageWithRegistry = registry !== undefined ? `${registry}/${image.name}:${image.tag}` : `${image.name}:${image.tag}`;

  const childProcess = spawnChildProcess(DOCKER_EXEC, Command.PULL, [imageWithRegistry], undefined, args.verbose, args.logger);

  const { exitCode, stderr } = await promisifyChildProcess(childProcess);

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.PULL} failed with exit code ${exitCode ?? 'null'}`);
  }
};

export const dockerVersion = async (args?: CommanderOptions): Promise<void> => {
  const childProcess = spawnChildProcess(DOCKER_EXEC, Command.VERSION, [], undefined, args?.verbose, args?.logger);

  const { exitCode, stderr } = await promisifyChildProcess(childProcess);

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.VERSION} failed with exit code ${exitCode ?? 'null'}`);
  }
};
