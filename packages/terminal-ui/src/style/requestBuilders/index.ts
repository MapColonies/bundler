import { StyleRequest } from '../styler';

export const PREFIX = (command: string): string => ` > executing ${command} command `;

export abstract class StyleRequestBuilder {
  public abstract build(data: unknown): StyleRequest;
}
