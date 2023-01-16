import { EOL } from 'os';
import { BundleStatus } from '@bundler/core';
import { BUNDLE_FAILED_MESSAGE, BUNDLE_SUCCESS_MESSAGE, PREFIX } from '../commands/bundle/constants';
import { Status } from '../common/constants';
import { Content, ExtendedColumnifyOptions, StyleRequest, Title } from './styler';

const columnifyOptions: ExtendedColumnifyOptions = {
    align: 'left',
    preserveNewLines: true,
    columns: ['content', 'name', 'description'],
    showHeaders: false,
    columnSplitter: '   ',
};

export const convert = (data: BundleStatus): StyleRequest => {
  const executingContent = {
    isDim: true,
    content: `>   Executing tasks: ${data.tasksCompleted}/${data.tasksTotal} succeeded`,
    status: Status.PENDING,
    level: 3,
  };

  const archivingContent = {
    isDim: true,
    content: { data: [{ name: `Archiving bundle`, status: Status.PENDING }], config: columnifyOptions },
    status: data.status,
    level: 3,
  };

  const topLevelStatus = data.status;
  const contents: Content[] = data.repositories.map((repo) => {
    let imagesContent: Content | undefined = undefined;

    const images = repo.tasks.filter((t) => t.kind === 'Dockerfile' || t.kind === 'migrations.Dockerfile');
    if (images.length > 0) {
      const successed = images.filter((i) => i.status === Status.SUCCESS);
      const status = successed.length === images.length ? Status.SUCCESS : Status.PENDING;
      imagesContent = {
        level: 6,
        status,
        content: `${EOL}>   Loading images: ${successed.length}/${images.length} succeeded${EOL}`,
        isDim: true,
        subContent: {
          level: 9,
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
        level: 6,
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
        level: 6,
        status: status,
        content: { data, config: columnifyOptions },
        subContent: assetsContent ?? imagesContent,
      };
    }

    return {
      level: 3,
      content: { data: [{ name: repo.name, status: repo.status }], config: columnifyOptions },
      subContent: packagesContent ?? assetsContent ?? imagesContent,
      status: topLevelStatus,
    };
  });

  let suffix: Title | undefined = undefined;
  if (data.status === Status.SUCCESS) {
    suffix = { isBold: true, content: BUNDLE_SUCCESS_MESSAGE(data.output), status: data.status, level: 3 };
  } else if (data.status === Status.FAILURE) {
    suffix = { isBold: true, content: BUNDLE_FAILED_MESSAGE, status: data.status, level: 3 };
  }

  return {
    prefix: { content: PREFIX('bundle'), isBold: true, status: data.status },
    main: [data.allTasksCompleted ? archivingContent : executingContent, ...contents],
    suffix,
  };
};
