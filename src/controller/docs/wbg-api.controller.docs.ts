import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  wbgCountriesExample,
  wbgCountryDetailExample,
  wbgIndicatorDataByCountryExample,
  wbgIndicatorsBySourceExample,
  wbgIndicatorsExample,
  wbgSourcesExample,
  wbgTopicsExample,
} from 'src/controller/docs/examples/wbg-api.controller.examples';

function pageAndPerPageQueries(defaultPerPage: number) {
  return [
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: '页码，默认 1',
    }),
    ApiQuery({
      name: 'perPage',
      required: false,
      type: Number,
      description: `每页数量，默认 ${defaultPerPage}`,
    }),
  ];
}

export function ApiGetWbgSourcesDocs() {
  return applyDecorators(
    ApiOperation({ summary: '获取 World Bank 数据源列表' }),
    ...pageAndPerPageQueries(50),
    ApiOkResponse({
      description: 'World Bank 数据源列表',
      schema: {
        example: wbgSourcesExample,
      },
    }),
  );
}

export function ApiGetWbgCountriesDocs() {
  return applyDecorators(
    ApiOperation({ summary: '获取 World Bank 国家列表' }),
    ...pageAndPerPageQueries(100),
    ApiOkResponse({
      description: 'World Bank 国家列表',
      schema: {
        example: wbgCountriesExample,
      },
    }),
  );
}

export function ApiGetWbgIndicatorsDocs() {
  return applyDecorators(
    ApiOperation({ summary: '获取 World Bank 指标列表' }),
    ...pageAndPerPageQueries(100),
    ApiOkResponse({
      description: 'World Bank 指标列表',
      schema: {
        example: wbgIndicatorsExample,
      },
    }),
  );
}

export function ApiGetWbgTopicsDocs() {
  return applyDecorators(
    ApiOperation({ summary: '获取 World Bank 主题列表' }),
    ...pageAndPerPageQueries(100),
    ApiOkResponse({
      description: 'World Bank 主题列表',
      schema: {
        example: wbgTopicsExample,
      },
    }),
  );
}

export function ApiGetWbgIndicatorsBySourceDocs() {
  return applyDecorators(
    ApiOperation({ summary: '按数据源获取 World Bank 指标列表' }),
    ApiParam({
      name: 'sourceId',
      type: String,
      description: '数据源 ID',
    }),
    ...pageAndPerPageQueries(100),
    ApiOkResponse({
      description: '指定数据源下的指标列表',
      schema: {
        example: wbgIndicatorsBySourceExample,
      },
    }),
  );
}

export function ApiGetWbgCountryDetailDocs() {
  return applyDecorators(
    ApiOperation({ summary: '获取 World Bank 国家详情' }),
    ApiParam({
      name: 'countryCode',
      type: String,
      description: '国家代码，例如 cn、us',
    }),
    ApiOkResponse({
      description: '国家详情',
      schema: {
        example: wbgCountryDetailExample,
      },
    }),
  );
}

export function ApiGetWbgIndicatorDataByCountryDocs() {
  return applyDecorators(
    ApiOperation({ summary: '按国家和指标获取 World Bank 数据' }),
    ApiParam({
      name: 'countryCode',
      type: String,
      description: '国家代码，例如 cn、us',
    }),
    ApiParam({
      name: 'indicatorCode',
      type: String,
      description: '指标编码，例如 NY.GDP.MKTP.CD',
    }),
    ...pageAndPerPageQueries(100),
    ApiQuery({
      name: 'date',
      required: false,
      type: String,
      description: '年份或年份范围，例如 2020 或 2010:2020',
    }),
    ApiOkResponse({
      description: '国家指标数据',
      schema: {
        example: wbgIndicatorDataByCountryExample,
      },
    }),
  );
}