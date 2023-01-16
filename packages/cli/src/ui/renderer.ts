import { ExitCodes } from '../common/constants';
import { style, StyleRequest } from './styler';
import { StreamFunc } from './terminalStreamer';

const DEFAULT_RENDER_INTERVAL = 60;

export class Renderer {
    private readonly renderIntervalId?: NodeJS.Timeout;
    private request?: StyleRequest;

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

    public set current(request: StyleRequest) {
        this.request = request;
    }

    public render(): void {
        if (!this.request) {
            return;
        }

        const styled = style(this.request);

        this.stream(styled);
    }

    private clearRenderInterval(): void {
        if (this.renderIntervalId) {
            clearInterval(this.renderIntervalId);
        }
    }
}
