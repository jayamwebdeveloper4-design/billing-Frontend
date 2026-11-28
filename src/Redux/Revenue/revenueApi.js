import { baseApi } from '../baseApi';

export const revenueApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/revenue (supports ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD)
    getRevenueOrders: builder.query({
      query: (params = {}) => {
        const cleanParams = {};
        if (params.startDate) cleanParams.startDate = params.startDate;
        if (params.endDate) cleanParams.endDate = params.endDate;
        return {
          url: '/revenue',
          method: 'GET',
          params: cleanParams,
        };
      },
      providesTags: [{ type: 'Revenue', id: 'LIST' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetRevenueOrdersQuery,
  useLazyGetRevenueOrdersQuery,
} = revenueApi;

