import * as crypto from 'crypto';

export const escapeElasticReservedChars = (keyword) => {
  return keyword.replace(/([\!\*\+\&\|\(\)\[\]\{\}\^\~\?\:\"])/g, '\\$1');
};

export function normalizeUrl(url) {
  return url.trim().toLowerCase().replace(/\/$/, ''); // 去掉尾部斜杠并转小写
}

export function urlToId(url) {
  return crypto.createHash('md5').update(normalizeUrl(url)).digest('hex');
}
