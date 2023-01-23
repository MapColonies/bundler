import axios from 'axios';
import { HTTP_CLIENT_TIMEOUT } from '../bundler/constants';
import { writeBuffer } from '../common/util';
import { DownloadArgs } from './interfaces';

export const httpDownload = async (args: DownloadArgs): Promise<void> => {
  const { url, destination } = args;

  const buffer = await axios.get<Buffer>(url, { responseType: 'arraybuffer', timeout: HTTP_CLIENT_TIMEOUT });

  await writeBuffer(buffer.data, destination);
};
