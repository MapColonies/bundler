import { TypedEmitter } from 'tiny-typed-emitter';
import { IParentLogger } from '@bundler/common';
import {
  dockerBuild,
  DockerBuildArgs,
  dockerPull,
  DockerPullArgs,
  dockerSave,
  DockerSaveArgs,
  helmPackage,
  HelmPackageArgs,
  terminateChildren,
} from '@bundler/child-process';
import { DownloadArgs, httpDownload } from '../http/download';
import { DockerCommanderEvents, HelmCommanderEvents, HttpCommanderEvents } from './events';

interface CommanderOptions {
  verbose?: boolean;
  logger?: IParentLogger;
}

export class TaskCommander extends TypedEmitter<DockerCommanderEvents & HelmCommanderEvents & HttpCommanderEvents> {
  public constructor(private readonly options?: CommanderOptions) {
    super();
  }

  public async build(args: DockerBuildArgs): Promise<void> {
    try {
      await dockerBuild({ ...args, ...this.options });
      this.emit('buildCompleted', args.image);
    } catch (error) {
      this.emit('commandFailed', args.image, error);
    }
  }

  public async pull(args: DockerPullArgs): Promise<void> {
    try {
      await dockerPull({ ...args, ...this.options });
      this.emit('pullCompleted', args.image);
    } catch (error) {
      this.emit('commandFailed', args.image, error);
    }
  }

  public async save(args: DockerSaveArgs): Promise<void> {
    try {
      await dockerSave({ ...args, ...this.options });
      this.emit('saveCompleted', args.image);
    } catch (error) {
      this.emit('commandFailed', args.image, error);
    }
  }

  public async package(args: HelmPackageArgs): Promise<void> {
    try {
      await helmPackage({ ...args, ...this.options });
      this.emit('packageCompleted', args.helmPackage);
    } catch (error) {
      this.emit('commandFailed', args.helmPackage, error);
    }
  }

  public async download(args: DownloadArgs): Promise<void> {
    try {
      await httpDownload({ ...args, ...this.options });
      this.emit('downloadCompleted', args.downloadObj);
    } catch (error) {
      this.emit('commandFailed', args.downloadObj, error);
    }
  }

  public terminate(): void {
    const result = terminateChildren();

    this.emit('terminateCompleted', result);
  }
}
