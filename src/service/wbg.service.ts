import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { readCsv } from 'src/utils/file';
import { HackerNewsService } from './hackerNews.service';
import * as _ from 'lodash';
import { WbgApiService } from 'src/service/wbg-api.service';

@Injectable()
export class WbgService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly hackerNewsService: HackerNewsService,
    private readonly wbgApiService: WbgApiService,
  ) {}

  public async importCountries() {
    const perPage = 100;
    const allCountries: any[] = [];

    const firstPage = await this.wbgApiService.getCountryList(1, perPage);
    const [firstMeta, firstData] = firstPage;
    allCountries.push(...firstData);

    const totalPages = Number(firstMeta?.pages || 1);
    for (let page = 2; page <= totalPages; page++) {
      console.log(`Fetching countries page: ${page} / ${totalPages}`);
      const [, pageData] = await this.wbgApiService.getCountryList(
        page,
        perPage,
      );
      allCountries.push(...pageData);
    }

    const countryRecords = allCountries
      .filter((country) => country?.id)
      .map((country) => ({
        id: String(country.id),
        iso2Code: country.iso2Code ?? null,
        name: country.name ?? null,
        regionId: country.region?.id ?? null,
        regionIso2Code: country.region?.iso2code ?? null,
        regionValue: country.region?.value ?? null,
        adminRegionId: country.adminregion?.id ?? null,
        adminRegionIso2Code: country.adminregion?.iso2code ?? null,
        adminRegionValue: country.adminregion?.value ?? null,
        incomeLevelId: country.incomeLevel?.id ?? null,
        incomeLevelIso2Code: country.incomeLevel?.iso2code ?? null,
        incomeLevelValue: country.incomeLevel?.value ?? null,
        lendingTypeId: country.lendingType?.id ?? null,
        lendingTypeIso2Code: country.lendingType?.iso2code ?? null,
        lendingTypeValue: country.lendingType?.value ?? null,
        capitalCity: country.capitalCity ?? null,
        longitude: country.longitude ?? null,
        latitude: country.latitude ?? null,
      }));

    await this.prisma.wbgCountry.deleteMany();

    if (countryRecords.length > 0) {
      await this.prisma.wbgCountry.createMany({
        data: countryRecords,
      });
    }

    console.log(`Imported countries: ${countryRecords.length}`);
  }

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
    const total = await this.prisma.wbgIndicator.count({
      where: {
        value_cn: null,
      },
    });
    let current = 0;

    while (true) {
      const allRecords = await this.prisma.wbgIndicator.findMany({
        where: {
          value_cn: null,
        },
        take: 100,
      });
      if (allRecords.length === 0) {
        console.log('All indicators have been translated.');
        break;
      }

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
              id: ids[i],
              value_cn: d,
            };
          });
        });
        const results = await Promise.allSettled(promises);

        for (const res of results) {
          if (res.status === 'fulfilled') {
            const recordsToUpdate = res.value;
            for (const record of recordsToUpdate) {
              await this.prisma.wbgIndicator.update({
                where: {
                  id: record.id,
                },
                data: {
                  value_cn: record.value_cn,
                },
              });
            }
          } else {
            console.error('Error translating records:', res.reason);
          }
        }
      }
    }
  }
}
