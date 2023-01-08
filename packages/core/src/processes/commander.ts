import { TypedEmitter } from 'tiny-typed-emitter';
import { ILogger } from '../common/types';
import { dockerBuild, dockerPull, dockerSave, DOCKER_EXEC } from './docker';
import { DockerBuildArgs, DockerPullArgs, DockerSaveArgs, EnvOptions, HelmPackageArgs, Image } from './interfaces';
import { helmPackage, HELM_EXEC } from './helm';
import { terminateSpawns } from '.';

interface BaseCommanderEvents {
  commandFailed: (obj: unknown, error: unknown, message?: string) => void;
  terminateCompleted: () => void;
}

interface HelmCommanderEvents extends BaseCommanderEvents {
  packageCompleted: (packageId: string) => Promise<void> | void;
}

interface DockerCommanderEvents extends BaseCommanderEvents {
  buildCompleted: (image: Image) => Promise<void> | void;
  pullCompleted: (image: Image) => Promise<void> | void;
  saveCompleted: (image: Image) => Promise<void> | void;
}

export interface CommanderOptions {
  verbose?: boolean;
  logger?: ILogger;
}

export class Commander extends TypedEmitter<DockerCommanderEvents & HelmCommanderEvents> {
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

  public async package(args: HelmPackageArgs): Promise<void> {
    try {
      await helmPackage({ ...args, ...this.options });
      this.emit('packageCompleted', args.packageId);
    } catch (error) {
      this.emit('commandFailed', args.packageId, error);
      throw error;
    }
  }

  public terminate(): void {
    [DOCKER_EXEC, HELM_EXEC].forEach((spawn) => {
      terminateSpawns(spawn);
    });

    this.emit('terminateCompleted');
  }
}
