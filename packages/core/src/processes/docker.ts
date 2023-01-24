/* eslint-disable @typescript-eslint/naming-convention */ // global envOptions does not follow convention
import { ILogger } from '../common/types';
import { DockerBuildArgs, DockerPullArgs, DockerSaveArgs } from './interfaces';
import { CommanderOptions } from './commander';
import { spawnChild } from './childProcess';

enum Command {
  BUILD = 'build',
  SAVE = 'save',
  PULL = 'pull',
  VERSION = 'version',
}

export const DOCKER_EXEC = 'docker';

export const dockerBuild = async (args: DockerBuildArgs & CommanderOptions): Promise<void> => {
  const { dockerFile, image, path, envOptions, verbose, logger } = args;

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({ image }, { level: 'debug' });
  }

  const childProcess = spawnChild(DOCKER_EXEC, Command.BUILD, ['-f', dockerFile, '-t', `${image.name}:${image.tag}`, path], envOptions, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.BUILD} failed with exit code ${exitCode}`);
  }
};

export const dockerSave = async (args: DockerSaveArgs & CommanderOptions): Promise<void> => {
  const { image, registry, path, verbose, logger } = args;

  const finalImageName = registry !== undefined ? `${registry}/${image.name}:${image.tag}` : `${image.name}:${image.tag}`;

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({ image }, { level: 'debug' });
  }

  const childProcess = spawnChild(DOCKER_EXEC, Command.SAVE, ['-o', path, finalImageName], undefined, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.SAVE} failed with exit code ${exitCode}`);
  }
};

export const dockerPull = async (args: DockerPullArgs & CommanderOptions): Promise<void> => {
  const { registry, image, verbose, logger } = args;

  const imageWithRegistry = registry !== undefined ? `${registry}/${image.name}:${image.tag}` : `${image.name}:${image.tag}`;

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({ image }, { level: 'debug' });
  }

  const childProcess = spawnChild(DOCKER_EXEC, Command.PULL, [imageWithRegistry], undefined, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.PULL} failed with exit code ${exitCode}`);
  }
};

export const dockerVersion = async (args?: CommanderOptions & CommanderOptions): Promise<void> => {
  const { verbose, logger } = args ?? {};

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({}, { level: 'debug' });
  }

  const childProcess = spawnChild(DOCKER_EXEC, Command.VERSION, [], undefined, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.VERSION} failed with exit code ${exitCode}`);
  }
};
