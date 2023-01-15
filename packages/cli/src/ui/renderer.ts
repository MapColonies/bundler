import { EOL } from 'os';
import { BundleStatus } from '@bundler/core';
import { ExitCodes, Status } from '../common/constants';
import { BUNDLE_FAILED_MESSAGE, BUNDLE_SUCCESS_MESSAGE, PREFIX } from '../commands/bundle/constants';
import { Content, ExtendedColumnifyOptions, style, Title } from './styler';
import { StreamFunc } from './terminalStreamer';

const DEFAULT_RENDER_INTERVAL = 100;

const columnifyOptions: ExtendedColumnifyOptions = {
    align: 'left',
    preserveNewLines: true,
    columns: ['content', 'name', 'description'],
    showHeaders: false,
    columnSplitter: '   ',
};

export class Renderer {
    private readonly renderIntervalId?: NodeJS.Timeout;
    private data?: BundleStatus;

    public constructor(private readonly stream: StreamFunc, interval: number = DEFAULT_RENDER_INTERVAL) {
        process.on('exit', (code: number) => {
            this.clearRenderInterval();
            if (code === ExitCodes.SUCCESS) {
                this.render();
            }
        });

        process.on('SIGINT', () => this.clearRenderInterval());
        process.on('SIGTERM', () => this.clearRenderInterval());
        process.on('SIGHUP', () => this.clearRenderInterval());

        this.renderIntervalId = setInterval(this.render.bind(this), interval);
    }

    public update(data: BundleStatus): void {
        this.data = data;
    }

    public render(): void {
        if (!this.data) {
            return;
        }

        const executingContent = {
            isDim: true,
            content: `>   Executing tasks: ${this.data.tasksCompleted}/${this.data.tasksTotal} succeeded`,
            status: this.data.status,
            level: 3,
        };

        const archivingContent = {
            isDim: true,
            content: { data: [{ name: `Archiving bundle`, status: this.data.status }], config: columnifyOptions },
            status: this.data.status,
            level: 3,
        };

        const topLevelStatus = this.data.status;
        const contents: Content[] = this.data.repositories.map((repo) => {
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
        if (this.data.status === Status.SUCCESS) {
            suffix = { isBold: true, content: BUNDLE_SUCCESS_MESSAGE(this.data.output), status: this.data.status, level: 3 };
        } else if (this.data.status === Status.FAILURE) {
            suffix = { isBold: true, content: BUNDLE_FAILED_MESSAGE, status: this.data.status, level: 3 };
        }

        const request = {
            prefix: { content: PREFIX('bundle'), isBold: true, status: this.data.status },
            main: [this.data.allTasksCompleted ? archivingContent : executingContent, ...contents],
            suffix,
        }

        const styled = style(request);

        this.stream(styled);
    }

    private clearRenderInterval(): void {
        if (this.renderIntervalId) {
            clearInterval(this.renderIntervalId);
        }
    }
}
