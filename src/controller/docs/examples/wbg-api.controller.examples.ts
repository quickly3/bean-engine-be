export const wbgSourcesExample = [
  {
    page: 1,
    pages: 1,
    per_page: '50',
    total: 1,
  },
  [
    {
      id: '1',
      lastupdated: '2021-08-18',
      name: 'Doing Business',
      code: 'DBS',
      dataavailability: 'Y',
      metadataavailability: 'Y',
      concepts: '3',
    },
  ],
];

export const wbgCountriesExample = [
  {
    page: 1,
    pages: 3,
    per_page: '100',
    total: 296,
  },
  [
    {
      id: 'CN',
      iso2Code: 'CN',
      name: 'China',
      region: {
        id: 'EAS',
        value: 'East Asia & Pacific',
      },
      incomeLevel: {
        id: 'UMC',
        value: 'Upper middle income',
      },
      lendingType: {
        id: 'IBD',
        value: 'IBRD',
      },
      capitalCity: 'Beijing',
      longitude: '116.286',
      latitude: '39.905',
    },
  ],
];

export const wbgIndicatorsExample = [
  {
    page: 1,
    pages: 1,
    per_page: '100',
    total: 1,
  },
  [
    {
      id: 'NY.GDP.MKTP.CD',
      name: 'GDP (current US$)',
      unit: '',
      source: {
        id: '2',
        value: 'World Development Indicators',
      },
      sourceNote: 'GDP at purchaser\'s prices is the sum of gross value added.',
      sourceOrganization: 'World Bank national accounts data.',
      topics: [
        {
          id: '3',
          value: 'Economy & Growth',
        },
      ],
    },
  ],
];

export const wbgTopicsExample = [
  {
    page: 1,
    pages: 1,
    per_page: '100',
    total: 1,
  },
  [
    {
      id: '3',
      value: 'Economy & Growth',
      sourceNote: 'Macroeconomic and structural policies.',
    },
  ],
];

export const wbgIndicatorsBySourceExample = [
  {
    page: 1,
    pages: 1,
    per_page: '100',
    total: 1,
  },
  [
    {
      id: 'NY.GDP.MKTP.CD',
      name: 'GDP (current US$)',
      source: {
        id: '2',
        value: 'World Development Indicators',
      },
    },
  ],
];

export const wbgCountryDetailExample = [
  {
    page: 1,
    pages: 1,
    per_page: '50',
    total: 1,
  },
  [
    {
      id: 'CN',
      iso2Code: 'CN',
      name: 'China',
      region: {
        id: 'EAS',
        value: 'East Asia & Pacific',
      },
      adminregion: {
        id: '',
        value: '',
      },
      incomeLevel: {
        id: 'UMC',
        value: 'Upper middle income',
      },
      lendingType: {
        id: 'IBD',
        value: 'IBRD',
      },
      capitalCity: 'Beijing',
      longitude: '116.286',
      latitude: '39.905',
    },
  ],
];

export const wbgIndicatorDataByCountryExample = [
  {
    page: 1,
    pages: 1,
    per_page: '100',
    total: 1,
  },
  [
    {
      indicator: {
        id: 'NY.GDP.MKTP.CD',
        value: 'GDP (current US$)',
      },
      country: {
        id: 'CN',
        value: 'China',
      },
      countryiso3code: 'CHN',
      date: '2024',
      value: 17794782123456.78,
      unit: '',
      obs_status: '',
      decimal: 0,
    },
  ],
];