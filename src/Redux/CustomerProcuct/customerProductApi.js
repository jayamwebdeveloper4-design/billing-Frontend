import { baseApi } from '../baseApi';

export const customerProductApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. GET /api/customer-products (filter + sort + pagination)
    getCustomerProducts: builder.query({
      query: (params = {}) => ({
        url: '/customer-products',
        method: 'GET',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'CustomerProduct', id: _id })),
              { type: 'CustomerProduct', id: 'LIST' },
            ]
          : [{ type: 'CustomerProduct', id: 'LIST' }],
    }),

    // 2. GET /api/customer-products/grouped?customerId=...&page=1&limit=10
    getGroupedByOrder: builder.query({
      query: (params = {}) => ({
        url: '/customer-products/grouped',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'CustomerProduct', id: 'GROUPED' }],
    }),

    // 3. GET /api/customer-products/renewals?type=upcoming&days=30&customerId=...
    getCustomerRenewals: builder.query({
      query: (params = {}) => ({
        url: '/customer-products/renewals',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'CustomerProduct', id: 'RENEWALS' }],
    }),

    // 4. GET /api/customer-products/order/:orderId
    getOrderProducts: builder.query({
      query: (orderId) => `/customer-products/order/${orderId}`,
      providesTags: (result, error, orderId) => [
        { type: 'CustomerProduct', id: `ORDER_${orderId}` },
      ],
    }),

    // 5. GET /api/customer-products/:id
    getCustomerProductById: builder.query({
      query: (id) => `/customer-products/${id}`,
      providesTags: (result, error, id) => [{ type: 'CustomerProduct', id }],
    }),

    // 6. POST /api/customer-products (Create products in bulk for an order)
    createOrderProducts: builder.mutation({
      query: (body) => ({
        url: '/customer-products',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'CustomerProduct', id: 'GROUPED' },
        { type: 'CustomerProduct', id: 'RENEWALS' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 7. PUT /api/customer-products/:id (Update product details)
    updateCustomerProduct: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/customer-products/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CustomerProduct', id },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'CustomerProduct', id: 'GROUPED' },
        { type: 'CustomerProduct', id: 'RENEWALS' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 8. PATCH /api/customer-products/:id/deactivate (Deactivate/reactivate product)
    setDeactiveProduct: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/customer-products/${id}/deactivate`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CustomerProduct', id },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'CustomerProduct', id: 'GROUPED' },
        { type: 'CustomerProduct', id: 'RENEWALS' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 9. DELETE /api/customer-products/:id (Delete a single product)
    deleteCustomerProduct: builder.mutation({
      query: (id) => ({
        url: `/customer-products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'CustomerProduct', id },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'CustomerProduct', id: 'GROUPED' },
        { type: 'CustomerProduct', id: 'RENEWALS' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 10. DELETE /api/customer-products/order/:orderId (Delete all products of an order)
    deleteOrderProducts: builder.mutation({
      query: (orderId) => ({
        url: `/customer-products/order/${orderId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, orderId) => [
        { type: 'CustomerProduct', id: `ORDER_${orderId}` },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'CustomerProduct', id: 'GROUPED' },
        { type: 'CustomerProduct', id: 'RENEWALS' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 11. POST /api/customer-products/:id/payments (Add a payment to a product)
    addPayment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/customer-products/${id}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CustomerProduct', id },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 12. PUT /api/customer-products/:id/payments/:paymentId (Update a payment)
    updatePayment: builder.mutation({
      query: ({ id, paymentId, ...body }) => ({
        url: `/customer-products/${id}/payments/${paymentId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CustomerProduct', id },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 13. DELETE /api/customer-products/:id/payments/:paymentId (Delete a payment)
    deletePayment: builder.mutation({
      query: ({ id, paymentId }) => ({
        url: `/customer-products/${id}/payments/${paymentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CustomerProduct', id },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  // Queries with standard & backwards-compatible aliases
  useGetCustomerProductsQuery,
  useGetCustomerProductsQuery: useGetProductsQuery,
  useLazyGetCustomerProductsQuery,
  useLazyGetCustomerProductsQuery: useLazyGetProductsQuery,
  useGetGroupedByOrderQuery,
  useLazyGetGroupedByOrderQuery,
  useGetCustomerRenewalsQuery,
  useGetCustomerRenewalsQuery: useGetRenewalsQuery,
  useLazyGetCustomerRenewalsQuery,
  useLazyGetCustomerRenewalsQuery: useLazyGetRenewalsQuery,
  useGetOrderProductsQuery,
  useLazyGetOrderProductsQuery,
  useGetCustomerProductByIdQuery,
  useGetCustomerProductByIdQuery: useGetProductByIdQuery,
  useLazyGetCustomerProductByIdQuery,
  useLazyGetCustomerProductByIdQuery: useLazyGetProductByIdQuery,

  // Mutations with standard & backwards-compatible aliases
  useCreateOrderProductsMutation,
  useUpdateCustomerProductMutation,
  useUpdateCustomerProductMutation: useUpdateProductMutation,
  useSetDeactiveProductMutation,
  useDeleteCustomerProductMutation,
  useDeleteCustomerProductMutation: useDeleteProductMutation,
  useDeleteOrderProductsMutation,
  useAddPaymentMutation,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,
} = customerProductApi;
