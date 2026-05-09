import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  countryPageExample,
  dataSourcePageExample,
  indicatorPageExample,
  indicatorWithSourcePageExample,
} from 'src/controller/docs/examples/wbg-query.controller.examples';

function pageAndPageSizeQueries() {
  return [
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: '页码，默认 1',
    }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      type: Number,
      description: '每页数量，默认 20，最大 100',
    }),
  ];
}

function indicatorFilterQueries() {
  return [
    ApiQuery({
      name: 'sourceId',
      required: false,
      type: Number,
      description: '按 sourceId 精确过滤',
    }),
    ApiQuery({
      name: 'indicator',
      required: false,
      type: String,
      description: '按 indicator 模糊查询',
    }),
    ApiQuery({
      name: 'keyword',
      required: false,
      type: String,
      description: '按 value/value_cn 模糊查询',
    }),
  ];
}

export function ApiGetWbgDataSourcesDocs() {
  return applyDecorators(
    ApiOperation({ summary: '查询 WbgDataSource 列表' }),
    ...pageAndPageSizeQueries(),
    ApiQuery({
      name: 'code',
      required: false,
      type: String,
      description: '按数据源编码模糊查询',
    }),
    ApiQuery({
      name: 'keyword',
      required: false,
      type: String,
      description: '按名称（中/英）模糊查询',
    }),
    ApiOkResponse({
      description: 'WbgDataSource 分页结果',
      schema: {
        example: dataSourcePageExample,
      },
    }),
  );
}

export function ApiGetWbgIndicatorsDocs() {
  return applyDecorators(
    ApiOperation({ summary: '查询 WbgIndicator 列表' }),
    ...pageAndPageSizeQueries(),
    ...indicatorFilterQueries(),
    ApiOkResponse({
      description: 'WbgIndicator 分页结果',
      schema: {
        example: indicatorPageExample,
      },
    }),
  );
}

export function ApiGetWbgIndicatorsWithDataSourceDocs() {
  return applyDecorators(
    ApiOperation({ summary: '查询 WbgIndicator 列表（含 dataSource）' }),
    ...pageAndPageSizeQueries(),
    ...indicatorFilterQueries(),
    ApiOkResponse({
      description: 'WbgIndicator（含 dataSource）分页结果',
      schema: {
        example: indicatorWithSourcePageExample,
      },
    }),
  );
}

export function ApiGetWbgCountriesDocs() {
  return applyDecorators(
    ApiOperation({ summary: '查询 WbgCountry 列表' }),
    ...pageAndPageSizeQueries(),
    ApiQuery({
      name: 'iso2Code',
      required: false,
      type: String,
      description: '按 iso2Code 模糊查询',
    }),
    ApiQuery({
      name: 'regionId',
      required: false,
      type: String,
      description: '按 regionId 精确过滤',
    }),
    ApiQuery({
      name: 'keyword',
      required: false,
      type: String,
      description: '按国家名或首都模糊查询',
    }),
    ApiOkResponse({
      description: 'WbgCountry 分页结果',
      schema: {
        example: countryPageExample,
      },
    }),
  );
}
