import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiGetWbgDataSourcesDocs,
  ApiGetWbgIndicatorsDocs,
  ApiGetWbgIndicatorsWithDataSourceDocs,
} from 'src/controller/docs/wbg-query.controller.docs';
import { WbgQueryService } from 'src/service/wbg-query.service';

@ApiTags('wbg')
@Controller('wbg')
export class WbgQueryController {
  constructor(private readonly wbgQueryService: WbgQueryService) {}

  @Get('data-sources')
  @ApiGetWbgDataSourcesDocs()
  async getDataSources(@Query() query) {
    return this.wbgQueryService.getDataSources(query);
  }

  @Get('indicators')
  @ApiGetWbgIndicatorsDocs()
  async getIndicators(@Query() query) {
    return this.wbgQueryService.getIndicators(query);
  }

  @Get('indicators-with-data-source')
  @ApiGetWbgIndicatorsWithDataSourceDocs()
  async getIndicatorsWithDataSource(@Query() query) {
    return this.wbgQueryService.getIndicatorsWithDataSource(query);
  }
}
