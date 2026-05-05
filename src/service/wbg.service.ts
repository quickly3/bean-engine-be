import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { readCsv } from 'src/utils/file';
import { HackerNewsService } from './hackerNews.service';
import * as _ from 'lodash';

@Injectable()
export class WbgService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly hackerNewsService: HackerNewsService,
  ) {}
  public async importWbgData() {
    const sourceFile = 'output/wbg/source.csv';

    const sourceData = await readCsv(sourceFile);
    sourceData.map((item) => {
      item.id = Number(item.id);
    });

    await this.prisma.wbgDataSource.deleteMany();

    await this.prisma.wbgDataSource.createMany({
      data: sourceData,
    });
  }

  public async importIndicators() {
    const inds = await this.prisma.wbgDataSource.findMany();
    const t = inds.length;
    let c = 0;
    for (const ind of inds) {
      c += 1;
      console.log(`Processing indicator: ${c} / ${t}`);
      const { id } = ind;
      const indFile = `output/wbg/indicators/indicators_${id}.csv`;
      const allRecords = await readCsv(indFile);

      await this.prisma.wbgIndicator.deleteMany({
        where: {
          sourceId: ind.id,
        },
      });
      await this.prisma.wbgIndicator.createMany({
        data: allRecords.map((record) => {
          return {
            sourceId: ind.id,
            indicator: record.id,
            value: record.value,
          };
        }),
      });
    }
  }

  public async transIndicators() {
    const inds = await this.prisma.wbgDataSource.findMany();
    const t = inds.length;
    let c = 0;
    for (const ind of inds) {
      c += 1;
      console.log(`Processing indicator: ${c} / ${t}`);
      const { id } = ind;
      const indFile = `output/wbg/indicators/indicators_${id}.csv`;
      const allRecords = await readCsv(indFile);

      const total = allRecords.length;
      let current = 0;
      const chunkRecords = _.chunk(allRecords, 100);

      for (const records of chunkRecords) {
        current += records.length;
        console.log(`Translating records: ${current} / ${total}`);
        const _records: any = _.chunk(records, 20);

        const promises = _records.map(async (recs) => {
          const ids = recs.map((record) => record.id);
          const titles = recs.map((record) => record.value);

          let titles_cn = '';
          try {
            titles_cn = await this.hackerNewsService.gptTrans(titles);
          } catch (error) {
            console.error('Error translating records:', error);
          }

          const resultArray = Array.isArray(titles_cn)
            ? titles_cn
            : [titles_cn];
          return resultArray.map((d: string, i: number) => {
            return {
              indicator: ids[i],
              value: titles[i],
              value_cn: d,
            };
          });
        });
        const results = await Promise.allSettled(promises);

        const datas: any = [];
        for (const res of results) {
          if (res.status === 'fulfilled') {
            const recordsToUpdate = res.value;
            for (const record of recordsToUpdate) {
              datas.push({
                sourceId: ind.id,
                indicator: record.indicator,
                value: record.value,
                value_cn: record.value_cn,
              });
            }
          } else {
            console.error('Error translating records:', res.reason);
          }
        }
        await this.prisma.wbgIndicator.deleteMany({
          where: {
            sourceId: ind.id,
          },
        });
        await this.prisma.wbgIndicator.createMany({
          data: datas,
        });
      }
    }
  }
}
