import { baseApi } from '../baseApi';

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/reports (supports filterMode, year, month, startDate, endDate)
    getReportData: builder.query({
      query: (params = {}) => {
        const cleanParams = {};
        if (params.filterMode) cleanParams.filterMode = params.filterMode;
        if (params.year) cleanParams.year = params.year;
        if (params.month) cleanParams.month = params.month;
        if (params.startDate) cleanParams.startDate = params.startDate;
        if (params.endDate) cleanParams.endDate = params.endDate;
        return {
          url: '/reports',
          method: 'GET',
          params: cleanParams,
        };
      },
      providesTags: [{ type: 'Report', id: 'LIST' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetReportDataQuery,
  useLazyGetReportDataQuery,
} = reportApi;

