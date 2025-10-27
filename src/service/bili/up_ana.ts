import * as _ from 'lodash';
import { readCsv, readFilesInDirectory, saveMd } from '../../utils/file';
import * as path from 'path';

export const genUpsTitles = async (file) => {
  const separator = path.sep;
  const regex = new RegExp(`ups\\${separator}(\\d+)_`);
  console.log(file);
  const upId = file.match(regex)?.[1];

  const articles = await readCsv(file);

  const titles = articles.map((item) => item.title);
  saveMd(`../../output/bilibili/ups_titles/${upId}.txt`, titles.join('\n'));
};

const files = readFilesInDirectory('../../output/bilibili/ups');

for (const file of files) {
  genUpsTitles(file);
}
