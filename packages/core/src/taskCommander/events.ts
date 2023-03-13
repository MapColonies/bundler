import { HelmPackage, Image, TerminationResult } from '@map-colonies/bundler-child-process';
import { Identifiable } from '@map-colonies/bundler-common';
import { DownloadObject } from '../http/download';

export interface BaseCommanderEvents {
  commandFailed: (obj: Identifiable, error: unknown, message?: string) => void;
  terminateCompleted: (result: TerminationResult) => void;
}

export interface HelmCommanderEvents extends BaseCommanderEvents {
  packageCompleted: (halkdPackage: HelmPackage) => Promise<void> | void;
}

export interface HttpCommanderEvents extends BaseCommanderEvents {
  downloadCompleted: (download: DownloadObject) => Promise<void> | void;
}

export interface DockerCommanderEvents extends BaseCommanderEvents {
  buildCompleted: (image: Image) => Promise<void> | void;
  pullCompleted: (image: Image) => Promise<void> | void;
  saveCompleted: (image: Image) => Promise<void> | void;
}
