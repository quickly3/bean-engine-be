export const dataSourcePageExample = {
  list: [
    {
      id: 1,
      lastupdated: '2021-08-18',
      name: 'Doing Business',
      name_cn: '营商环境',
      code: 'DBS',
      databid: '3001',
      description: '',
      url: '',
      dataavailability: 'Y',
      metadataavailability: 'Y',
      concepts: '3',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

export const indicatorPageExample = {
  list: [
    {
      id: 1,
      sourceId: 1,
      indicator: 'NY.GDP.MKTP.CD',
      value: 'GDP (current US$)',
      value_cn: '国内生产总值（现价美元）',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

export const indicatorWithSourcePageExample = {
  list: [
    {
      id: 4763,
      sourceId: 1,
      indicator: 'ENF.CONT.COEN.ATDR',
      value:
        'Enforcing contracts: Alternative dispute resolution (0-3) (DB16-20 methodology)',
      value_cn: null,
      dataSource: {
        id: 1,
        lastupdated: '2021-08-18',
        name: 'Doing Business',
        name_cn: '营商环境',
        code: 'DBS',
        databid: '3001',
        description: '',
        url: '',
        dataavailability: 'Y',
        metadataavailability: 'Y',
        concepts: '3',
      },
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

export const countryPageExample = {
  list: [
    {
      id: 'CHN',
      iso2Code: 'CN',
      name: 'China',
      regionId: 'EAS',
      regionIso2Code: 'Z4',
      regionValue: 'East Asia & Pacific',
      adminRegionId: '',
      adminRegionIso2Code: '',
      adminRegionValue: '',
      incomeLevelId: 'UMC',
      incomeLevelIso2Code: 'XT',
      incomeLevelValue: 'Upper middle income',
      lendingTypeId: 'IBD',
      lendingTypeIso2Code: 'XF',
      lendingTypeValue: 'IBRD',
      capitalCity: 'Beijing',
      longitude: '116.286',
      latitude: '39.905',
      createdAt: '2026-05-08T00:00:00.000Z',
      updatedAt: '2026-05-08T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};
