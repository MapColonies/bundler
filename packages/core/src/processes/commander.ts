import { TypedEmitter } from 'tiny-typed-emitter';
import { ILogger, IParentLogger } from '../common/types';
import { dockerBuild, dockerPull, dockerSave } from './docker';
import {
  DockerBuildArgs,
  DockerPullArgs,
  DockerSaveArgs,
  DownloadArgs,
  DownloadObject,
  HelmPackage,
  HelmPackageArgs,
  Identifiable,
  Image,
} from './interfaces';
import { helmPackage } from './helm';
import { httpDownload } from './http';
import { terminateChildren, TerminationResult } from './childProcess';

interface BaseCommanderEvents {
  commandFailed: (obj: Identifiable, error: unknown, message?: string) => void;
  terminateCompleted: (result: TerminationResult) => void;
}

interface HelmCommanderEvents extends BaseCommanderEvents {
  packageCompleted: (halkdPackage: HelmPackage) => Promise<void> | void;
}

interface HttpCommanderEvents extends BaseCommanderEvents {
  downloadCompleted: (download: DownloadObject) => Promise<void> | void;
}

interface DockerCommanderEvents extends BaseCommanderEvents {
  buildCompleted: (image: Image) => Promise<void> | void;
  pullCompleted: (image: Image) => Promise<void> | void;
  saveCompleted: (image: Image) => Promise<void> | void;
}

export interface CommanderOptions {
  verbose?: boolean;
  logger?: IParentLogger;
}

export class Commander extends TypedEmitter<DockerCommanderEvents & HelmCommanderEvents & HttpCommanderEvents> {
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
