import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { normalizePagination } from 'src/utils/util';

type DataSourceQuery = {
  page?: string | number;
  pageSize?: string | number;
  code?: string;
  keyword?: string;
};

type IndicatorQuery = {
  page?: string | number;
  pageSize?: string | number;
  sourceId?: string | number;
  indicator?: string;
  keyword?: string;
};

@Injectable()
export class WbgQueryService {
  constructor(private readonly prisma: PrismaService) {}

  private buildIndicatorWhere(
    query: IndicatorQuery,
  ): Prisma.WbgIndicatorWhereInput {
    const where: Prisma.WbgIndicatorWhereInput = {};

    const sourceId = Number(query.sourceId);
    if (!Number.isNaN(sourceId) && sourceId > 0) {
      where.sourceId = sourceId;
    }

    if (query.indicator) {
      where.indicator = {
        contains: query.indicator,
        mode: 'insensitive',
      };
    }

    if (query.keyword) {
      where.OR = [
        {
          value: {
            contains: query.keyword,
            mode: 'insensitive',
          },
        },
        {
          value_cn: {
            contains: query.keyword,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }

  public async getDataSources(query: DataSourceQuery) {
    const { page, pageSize, skip, take } = normalizePagination(
      query.page,
      query.pageSize,
    );

    const where: Prisma.WbgDataSourceWhereInput = {};

    if (query.code) {
      where.code = {
        contains: query.code,
        mode: 'insensitive',
      };
    }

    if (query.keyword) {
      where.OR = [
        {
          name: {
            contains: query.keyword,
            mode: 'insensitive',
          },
        },
        {
          name_cn: {
            contains: query.keyword,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.wbgDataSource.findMany({
        where,
        skip,
        take,
        orderBy: {
          lastupdated: 'desc',
        },
      }),
      this.prisma.wbgDataSource.count({ where }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  public async getIndicators(query: IndicatorQuery) {
    const { page, pageSize, skip, take } = normalizePagination(
      query.page,
      query.pageSize,
    );

    const where = this.buildIndicatorWhere(query);

    const [list, total] = await Promise.all([
      this.prisma.wbgIndicator.findMany({
        where,
        skip,
        take,
        orderBy: {
          id: 'asc',
        },
      }),
      this.prisma.wbgIndicator.count({ where }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  public async getIndicatorsWithDataSource(query: IndicatorQuery) {
    const { page, pageSize, skip, take } = normalizePagination(
      query.page,
      query.pageSize,
    );

    const where = this.buildIndicatorWhere(query);

    const [list, total] = await Promise.all([
      this.prisma.wbgIndicator.findMany({
        where,
        skip,
        take,
        orderBy: {
          id: 'asc',
        },
      }),
      this.prisma.wbgIndicator.count({ where }),
    ]);

    const sourceIds = Array.from(
      new Set(
        list
          .map((item) => item.sourceId)
          .filter(
            (sourceId): sourceId is number => typeof sourceId === 'number',
          ),
      ),
    );

    const sources = sourceIds.length
      ? await this.prisma.wbgDataSource.findMany({
          where: {
            id: {
              in: sourceIds,
            },
          },
        })
      : [];

    const sourceMap = new Map(sources.map((source) => [source.id, source]));

    return {
      list: list.map((item) => ({
        ...item,
        dataSource: item.sourceId ? sourceMap.get(item.sourceId) || null : null,
      })),
      total,
      page,
      pageSize,
    };
  }
}
