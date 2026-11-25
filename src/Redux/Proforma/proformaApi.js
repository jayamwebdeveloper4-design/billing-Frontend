import { baseApi } from '../baseApi';

export const proformaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/proformas - Fetch all proforma records
    getProformas: builder.query({
      query: (params = {}) => ({
        url: '/proformas',
        method: 'GET',
        params,
      }),
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        return [];
      },
      providesTags: (result) => {
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : [];
        return [
          ...list.map((item) => ({ type: 'Proforma', id: item._id || item.id })),
          { type: 'Proforma', id: 'LIST' },
        ];
      },
    }),

    // GET /api/proformas/next-number - Fetch predicted next proforma number
    getNextProformaNumber: builder.query({
      query: (args) => {
        const params = typeof args === 'string' ? { invoiceType: args } : args || {};
        return {
          url: '/proformas/next-number',
          method: 'GET',
          params,
        };
      },
      transformResponse: (response) => response?.proformaNo || '',
    }),

    // POST /api/proformas - Create a new proforma record
    createProforma: builder.mutation({
      query: (body) => ({
        url: '/proformas',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Proforma', id: 'LIST' }],
    }),

    // PUT /api/proformas/:id - Update an existing proforma record
    updateProforma: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/proformas/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Proforma', id },
        { type: 'Proforma', id: 'LIST' },
      ],
    }),

    // DELETE /api/proformas/:id - Delete a proforma by ID
    deleteProforma: builder.mutation({
      query: (id) => ({
        url: `/proformas/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Proforma', id },
        { type: 'Proforma', id: 'LIST' },
      ],
    }),

    // POST /api/proformas/generate - Generate PDF blob from proforma payload
    generateProformaPdf: builder.mutation({
      query: (body) => ({
        url: '/proformas/generate',
        method: 'POST',
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetProformasQuery,
  useLazyGetProformasQuery,
  useGetNextProformaNumberQuery,
  useLazyGetNextProformaNumberQuery,
  useCreateProformaMutation,
  useUpdateProformaMutation,
  useDeleteProformaMutation,
  useGenerateProformaPdfMutation,
} = proformaApi;
