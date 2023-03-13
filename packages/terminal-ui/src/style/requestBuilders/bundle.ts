import { EOL } from 'os';
import { BundlerStage, BundleStatus } from '@map-colonies/bundler-core';
import { Status } from '@map-colonies/bundler-common';
import { Level, PADDING } from '../util';
import { Content, ExtendedColumnifyOptions, StyleRequest, Title } from '../styleRequest';
import { PREFIX, StyleRequestBuilder } from '.';

const COMMAND_NAME = 'bundle';

const BUNDLE_SUCCESS_MESSAGE = (path: string): string => `${PADDING}bundle is ready at ${path} 🎉${PADDING}`;
const BUNDLE_FAILED_MESSAGE = `${PADDING}bundle creation has failed 🥺${PADDING}`;

const columnifyOptions: ExtendedColumnifyOptions = {
  align: 'left',
  preserveNewLines: true,
  columns: ['content', 'name', 'description'],
  showHeaders: false,
  columnSplitter: PADDING.repeat(Level.FIRST),
};

const stageToStatus = (stage: BundlerStage): Status => {
  switch (stage) {
    case BundlerStage.DONE:
      return Status.SUCCESS;
    case BundlerStage.FAILURE:
      return Status.FAILURE;
    default:
      return Status.PENDING;
  }
};

export class BundleStyleRequestBuilder extends StyleRequestBuilder {
  public build(data: BundleStatus): StyleRequest {
    const messageContents: Content[] = [];

    if (data.stage === BundlerStage.INIT) {
      const calcContent = {
        isDim: true,
        content: { data: [{ name: `Calculating tasks`, status: Status.PENDING }], config: columnifyOptions },
        status: Status.PENDING,
        level: Level.FIRST,
      };
      messageContents.push(calcContent);
    } else {
      const executingStatus = data.stage === BundlerStage.EXECUTION ? Status.PENDING : Status.SUCCESS;
      const completedReposCount = data.repositories.filter((r) => r.status === Status.SUCCESS).length;
      const executingTasksContent = {
        isDim: true,
        content: {
          data: [
            {
              name: `Executing tasks: ${data.tasksCompleted}/${data.tasksTotal} succeeded from ${completedReposCount}/${data.repositories.length} repositories`,
              status: executingStatus,
            },
          ],
          config: columnifyOptions,
        },
        status: executingStatus,
        level: Level.FIRST,
      };

      messageContents.push(executingTasksContent);

      if (data.stage >= BundlerStage.ARCHIVE) {
        const archivingStatus = data.stage === BundlerStage.ARCHIVE ? Status.PENDING : Status.SUCCESS;
        const archivingContent = {
          isDim: true,
          content: { data: [{ name: `Archiving bundle`, status: archivingStatus }], config: columnifyOptions },
          status: archivingStatus,
          level: Level.FIRST,
        };

        messageContents.push(archivingContent);
      }

      if (data.stage >= BundlerStage.CHECKSUM) {
        const checksumStatus = data.stage === BundlerStage.CHECKSUM ? Status.PENDING : Status.SUCCESS;
        const checksumContent = {
          isDim: true,
          content: { data: [{ name: `Creating checksum`, status: checksumStatus }], config: columnifyOptions },
          status: checksumStatus,
          level: Level.FIRST,
        };

        messageContents.push(checksumContent);
      }
    }

    const topLevelStatus = stageToStatus(data.stage);
    const repoContents: Content[] = data.repositories.map((repo) => {
      let imagesContent: Content | undefined = undefined;

      const images = repo.tasks.filter((t) => t.kind === 'Dockerfile' || t.kind === 'migrations.Dockerfile');
      if (images.length > 0) {
        const successed = images.filter((i) => i.status === Status.SUCCESS);
        const status = successed.length === images.length ? Status.SUCCESS : Status.PENDING;
        imagesContent = {
          level: Level.SECOND,
          status,
          content: `${EOL}>   Loading images: ${successed.length}/${images.length} succeeded${EOL}`,
          isDim: true,
          subContent: {
            level: Level.THIRD,
            status,
            content: {
              data: images.map((i) => ({ name: i.name, status: i.status, description: i.content !== undefined ? `[${i.content}]` : undefined })),
              config: columnifyOptions,
            },
          },
        };
      }

      let assetsContent: Content | undefined = undefined;

      const assets = repo.tasks.filter((t) => t.kind === 'asset');
      if (assets.length > 0) {
        const successed = assets.filter((i) => i.status === Status.SUCCESS);
        const status = successed.length === assets.length ? Status.SUCCESS : Status.PENDING;
        const data = [{ name: `Getting assets: ${successed.length}/${assets.length} succeeded`, status }];
        assetsContent = {
          level: Level.SECOND,
          status: status,
          content: { data, config: columnifyOptions },
          subContent: imagesContent,
        };
      }

      let packagesContent: Content | undefined = undefined;

      const packages = repo.tasks.filter((t) => t.kind === 'helm');
      if (packages.length > 0) {
        const successed = packages.filter((i) => i.status === Status.SUCCESS);
        const status = successed.length === packages.length ? Status.SUCCESS : Status.PENDING;
        const data = [{ name: `Packaging helms: ${successed.length}/${packages.length} succeeded`, status }];
        packagesContent = {
          level: Level.SECOND,
          status: status,
          content: { data, config: columnifyOptions },
          subContent: assetsContent ?? imagesContent,
        };
      }

      return {
        level: Level.FIRST,
        content: { data: [{ name: repo.name, status: repo.status }], config: columnifyOptions },
        subContent: packagesContent ?? assetsContent ?? imagesContent,
        status: topLevelStatus,
      };
    });

    let suffix: Title | undefined = undefined;
    if (topLevelStatus === Status.SUCCESS) {
      suffix = { isBold: true, content: BUNDLE_SUCCESS_MESSAGE(data.output), status: topLevelStatus, level: Level.FIRST };
    } else if (topLevelStatus === Status.FAILURE) {
      suffix = { isBold: true, content: BUNDLE_FAILED_MESSAGE, status: topLevelStatus, level: Level.FIRST };
    }

    return {
      prefix: { content: PREFIX(COMMAND_NAME), isBold: true, status: topLevelStatus },
      main: [...repoContents, ...messageContents],
      suffix,
    };
  }
}
