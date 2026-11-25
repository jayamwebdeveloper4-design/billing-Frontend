import { baseApi } from '../baseApi';

export const invoiceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. GET /api/invoices (Request Invoice List from Payment History with Server Pagination & Filtering)
    // Supports query params: page, limit, search, type, month, year, customerId
    getInvoices: builder.query({
      query: (params = {}) => ({
        url: '/invoices',
        method: 'GET',
        params,
      }),
      transformResponse: (response) => {
        // If server returns paginated format: { data: [...], pagination: { page, limit, total, totalPages } }
        if (response && Array.isArray(response.data) && response.pagination) {
          return response;
        }
        // If server returns plain array: [...]
        if (Array.isArray(response)) {
          return {
            data: response,
            pagination: {
              page: 1,
              limit: response.length,
              total: response.length,
              totalPages: 1,
            },
          };
        }
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        };
      },
      providesTags: (result) => {
        const list = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
          ? result
          : [];
        return [
          ...list.map(({ _id }) => ({ type: 'Invoice', id: _id })),
          { type: 'Invoice', id: 'LIST' },
        ];
      },
    }),

    // 2. GET /api/invoices/:id/pdf (Download Invoice PDF Blob by Payment Record ID)
    getInvoicePdf: builder.query({
      query: (id) => ({
        url: `/invoices/${id}/pdf`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),

    // 3. GET /api/invoices/next-number (Predict next sequential invoice number)
    // Supports: ?invoiceType=withGST|withoutGST&invoiceDate=YYYY-MM-DD
    getNextInvoiceNumber: builder.query({
      query: (params = {}) => ({
        url: '/invoices/next-number',
        method: 'GET',
        params,
      }),
    }),

    // 4. GET /api/invoices/verify-number (Verify if invoice number is already assigned)
    // Supports: ?invoiceNo=...&paymentId=...
    verifyInvoiceNumber: builder.query({
      query: (params = {}) => ({
        url: '/invoices/verify-number',
        method: 'GET',
        params,
      }),
    }),

    // 5. POST /api/invoices/generate (Process and stream Invoice PDF blob)
    generateInvoicePdf: builder.mutation({
      query: (body) => ({
        url: '/invoices/generate',
        method: 'POST',
        body,
        responseHandler: (response) => response.blob(),
      }),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }],
    }),

    // 6. POST /api/invoices/:id/email (Send Invoice PDF to customer via email)
    emailInvoice: builder.mutation({
      query: ({ id, email, subject, message }) => ({
        url: `/invoices/${id}/email`,
        method: 'POST',
        body: { email, subject, message },
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetInvoicesQuery,
  useLazyGetInvoicesQuery,
  useGetInvoicePdfQuery,
  useLazyGetInvoicePdfQuery,
  useGetNextInvoiceNumberQuery,
  useLazyGetNextInvoiceNumberQuery,
  useVerifyInvoiceNumberQuery,
  useLazyVerifyInvoiceNumberQuery,
  useGenerateInvoicePdfMutation,
  useEmailInvoiceMutation,
} = invoiceApi;
