import * as fs from 'fs';
import * as UserAgent from 'user-agents';
import * as _ from 'lodash';
import * as simpleCookie from 'simple-cookie';

export function parseCookieFile() {
  const _cookies = fs.readFileSync('cookies.json', 'utf8');

  return JSON.parse(_cookies);
}

export function getCookieString() {
  const _cookies = fs.readFileSync('cookies.json', 'utf8');
  const jsonObj = JSON.parse(_cookies);
  console.log(jsonObj);
  return simpleCookie.stringify(jsonObj);
}

export function getRandomUA() {
  const userAgent = new UserAgent({ deviceCategory: 'desktop' });
  return userAgent.random().toString();
}
