import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiGetWbgCountriesDocs,
  ApiGetWbgCountryDetailDocs,
  ApiGetWbgIndicatorDataByCountryDocs,
  ApiGetWbgIndicatorsBySourceDocs,
  ApiGetWbgIndicatorsDocs,
  ApiGetWbgSourcesDocs,
  ApiGetWbgTopicsDocs,
} from 'src/controller/docs/wbg-api.controller.docs';
import { WbgApiService } from 'src/service/wbg-api.service';

type ListQuery = {
  page?: string;
  perPage?: string;
};

type IndicatorDataQuery = ListQuery & {
  date?: string;
};

@ApiTags('wbg-api')
@Controller('wbg-api')
export class WbgApiController {
  constructor(private readonly wbgApiService: WbgApiService) {}

  private toPositiveNumber(value: string | undefined, defaultValue: number) {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
  }

  @Get('sources')
  @ApiGetWbgSourcesDocs()
  async getSources(@Query() query: ListQuery) {
    return this.wbgApiService.getSources(
      this.toPositiveNumber(query.page, 1),
      this.toPositiveNumber(query.perPage, 50),
    );
  }

  @Get('countries')
  @ApiGetWbgCountriesDocs()
  async getCountries(@Query() query: ListQuery) {
    return this.wbgApiService.getCountries(
      this.toPositiveNumber(query.page, 1),
      this.toPositiveNumber(query.perPage, 100),
    );
  }

  @Get('indicators')
  @ApiGetWbgIndicatorsDocs()
  async getIndicators(@Query() query: ListQuery) {
    return this.wbgApiService.getIndicators(
      this.toPositiveNumber(query.page, 1),
      this.toPositiveNumber(query.perPage, 100),
    );
  }

  @Get('topics')
  @ApiGetWbgTopicsDocs()
  async getTopics(@Query() query: ListQuery) {
    return this.wbgApiService.getTopics(
      this.toPositiveNumber(query.page, 1),
      this.toPositiveNumber(query.perPage, 100),
    );
  }

  @Get('sources/:sourceId/indicators')
  @ApiGetWbgIndicatorsBySourceDocs()
  async getIndicatorsBySource(
    @Param('sourceId') sourceId: string,
    @Query() query: ListQuery,
  ) {
    return this.wbgApiService.getIndicatorsBySource(
      sourceId,
      this.toPositiveNumber(query.page, 1),
      this.toPositiveNumber(query.perPage, 100),
    );
  }

  @Get('countries/:countryCode')
  @ApiGetWbgCountryDetailDocs()
  async getCountryDetail(@Param('countryCode') countryCode: string) {
    return this.wbgApiService.getCountryDetail(countryCode);
  }

  @Get('getCountryList')
  @ApiGetWbgCountryDetailDocs()
  async getCountryList() {
    return this.wbgApiService.getCountryList();
  }

  @Get('countries/:countryCode/indicators/:indicatorCode')
  @ApiGetWbgIndicatorDataByCountryDocs()
  async getIndicatorDataByCountry(
    @Param('countryCode') countryCode: string,
    @Param('indicatorCode') indicatorCode: string,
    @Query() query: IndicatorDataQuery,
  ) {
    return this.wbgApiService.getIndicatorDataByCountry(
      countryCode,
      indicatorCode,
      this.toPositiveNumber(query.page, 1),
      this.toPositiveNumber(query.perPage, 100),
      query.date,
    );
  }
}
