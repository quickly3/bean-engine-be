import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import axios from 'axios';
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
        const record = {
          title: recordArr[0],
          category: 'prompt',
          summary: recordArr[1],
          source: 'chatgpt',
        };

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
