import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { readFileSync } from 'fs';
import { readFilesInDirectory } from 'src/utils/file';

@Injectable()
export class PromptsService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}
  async syncPromptCn() {
    const directoryPath = 'output/question';
    const files = readFilesInDirectory(directoryPath);

    const total = files.length - 1;
    let current = 0;

    for (const file of files) {
      const records: any = [];
      current++;
      console.log(`${current}/${total}`);
      console.log(file);

      const fileResp = readFileSync(file, { encoding: 'utf-8' });
      const lines = fileResp.split('\n');

      for (const i in lines) {
        if (parseInt(i) <= 1) {
          continue;
        }
        const line = lines[i].split('|');
        const recordArr = line
          .filter((l) => {
            return l.trim() !== '';
          })
          .map((r) => r.trim());
        const record: any = {
          title: recordArr[1],
          source: 'chatgpt',
        };

        let validCate = true;
        if (recordArr[0].match(/^[\d.]+$/)) {
          validCate = false;
        }

        if (recordArr[0].match(/^[-]+$/)) {
          validCate = false;
        }

        if (validCate) {
          record.category = recordArr[0];
        }

        if (!record.title || record.title === '') {
          continue;
        }

        records.push(record);
      }
      console.log(records.length);
      const body = records.flatMap((doc) => [
        { index: { _index: 'article' } },
        doc,
      ]);
      await this.elasticsearchService.bulk({ body });
    }
  }
}
