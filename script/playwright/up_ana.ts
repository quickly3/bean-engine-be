import * as _ from 'lodash';
import { readCsv, readFilesInDirectory, saveMd } from '../../src/utils/file';
import { title } from 'process';

export const analyseUp = async (upId: any) => {
  const articles = await readCsv(`../../output/bilibili/ups/${upId}.csv`);

  const titles = articles.map((item) => item.title);
  saveMd(`../../output/bilibili/ups/${upId}titles_.md`, titles.join('\n'));

  const subData = articles.map((i) => {
    return {
      title: i.title,
      description: i.description,
      comment: i.comment,
      play: i.play,
      created: i.created,
      length: i.length,
      bvid: i.bvid,
    };
  });
};

const files = readFilesInDirectory('../../output/bilibili/ups');

const file = _.find(files, (f) => {
  return f.includes('小约翰可汗');
});

if (file) {
  const upId = file.match(/ups\/(\d+)_/)[1];
  analyseUp(upId);
}
