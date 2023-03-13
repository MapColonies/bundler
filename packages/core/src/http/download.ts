import { Identifiable } from '@map-colonies/bundler-common';
import axios from 'axios';
import { HTTP_CLIENT_TIMEOUT } from '../bundler/constants';
import { writeBuffer } from '../common/util';

export interface DownloadObject extends Identifiable {}

export interface DownloadArgs {
  downloadObj: DownloadObject;
  url: string;
  destination: string;
}

export const httpDownload = async (args: DownloadArgs): Promise<void> => {
  const { url, destination } = args;

  const buffer = await axios.get<Buffer>(url, { responseType: 'arraybuffer', timeout: HTTP_CLIENT_TIMEOUT });

  await writeBuffer(buffer.data, destination);
};
