import { Injectable } from '@nestjs/common';
import axios from 'axios';

type WbgMeta = {
  page: number;
  pages: number;
  per_page: string;
  total: number;
};

type WbgListResponse<T> = [WbgMeta, T[]];

@Injectable()
export class WbgApiService {
  private readonly baseUrl = 'https://api.worldbank.org/v2';

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<WbgListResponse<T>> {
    const { data } = await axios.get<WbgListResponse<T>>(
      `${this.baseUrl}${endpoint}`,
      {
        params: {
          format: 'json',
          ...params,
        },
      },
    );

    return data;
  }

  public async getSources(page = 1, perPage = 50) {
    return this.request<any>('/sources', {
      page,
      per_page: perPage,
    });
  }

  public async getCountries(page = 1, perPage = 100) {
    return this.request<any>('/country', {
      page,
      per_page: perPage,
    });
  }

  public async getIndicators(page = 1, perPage = 100) {
    return this.request<any>('/indicator', {
      page,
      per_page: perPage,
    });
  }

  public async getTopics(page = 1, perPage = 100) {
    return this.request<any>('/topic', {
      page,
      per_page: perPage,
    });
  }

  public async getIndicatorDataByCountry(
    countryCode: string,
    indicatorCode: string,
    page = 1,
    perPage = 100,
    date?: string,
  ) {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
    };

    if (date) {
      params.date = date;
    }

    return this.request<any>(
      `/country/${countryCode}/indicator/${indicatorCode}`,
      params,
    );
  }

  public async getIndicatorsBySource(
    sourceId: string,
    page = 1,
    perPage = 100,
  ) {
    return this.request<any>(`/sources/${sourceId}/indicator`, {
      page,
      per_page: perPage,
    });
  }

  public async getCountryDetail(countryCode: string) {
    return this.request<any>(`/country/${countryCode}`);
  }
}
