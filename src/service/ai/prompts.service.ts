import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import axios from 'axios';

@Injectable()
export class PromptsService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}
  async syncPromptCn() {
    const dirUrl =
      'https://api.github.com/repos/PlexPt/awesome-chatgpt-prompts-zh/contents/question';
    const resp = await axios.get(dirUrl);

    if (resp) {
      const files = resp.data;
      const total = files.length - 1;
      let current = 0;

      for (const file of files) {
        const records: any = [];
        if (file.name === 'README.md') {
          continue;
        }
        current++;
        console.log(`${current}/${total}`);
        console.log(file.name);
        const fileUrl =
          'https://api.github.com/repos/PlexPt/awesome-chatgpt-prompts-zh/contents/question' +
          `/${file.name}`;
        const fileResp = await axios.get(fileUrl);
        const fileContent = Buffer.from(
          fileResp.data.content,
          'base64',
        ).toString('utf-8');
        const lines = fileContent.split('\n');

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
}
