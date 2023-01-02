import { TypedEmitter } from 'tiny-typed-emitter';
import { ILogger } from '../common/types';
import { dockerBuild, dockerPull, dockerSave, DOCKER_EXEC } from './docker';
import { DockerBuildArgs, DockerPullArgs, DockerSaveArgs, EnvOptions, Image } from './interfaces';
import { terminateSpawns } from '.';

interface DockerCommanderEvents {
  buildCompleted: (image: Image) => Promise<void> | void;
  pullCompleted: (image: Image) => Promise<void> | void;
  saveCompleted: (image: Image) => Promise<void> | void;
  commandFailed: (image: Image, error: unknown, message?: string) => void;
  terminateCompleted: () => void;
}

export interface CommanderOptions {
  verbose?: boolean;
  logger?: ILogger;
}

export class DockerCommander extends TypedEmitter<DockerCommanderEvents> {
  public constructor(private readonly options?: CommanderOptions) {
    super();
  }

  public async build(args: DockerBuildArgs & EnvOptions): Promise<void> {
    try {
      await dockerBuild({ ...args, ...this.options });
      this.emit('buildCompleted', args.image);
    } catch (error) {
      this.emit('commandFailed', args.image, error);
      throw error;
    }
  }

  public async pull(args: DockerPullArgs): Promise<void> {
    try {
      await dockerPull({ ...args, ...this.options });
      this.emit('pullCompleted', args.image);
    } catch (error) {
      this.emit('commandFailed', args.image, error);
      throw error;
    }
  }

  public async save(args: DockerSaveArgs): Promise<void> {
    try {
      await dockerSave({ ...args, ...this.options });
      this.emit('saveCompleted', args.image);
    } catch (error) {
      this.emit('commandFailed', args.image, error);
      throw error;
    }
  }

  public terminate(): void {
    terminateSpawns(DOCKER_EXEC);
    this.emit('terminateCompleted');
  }
}
