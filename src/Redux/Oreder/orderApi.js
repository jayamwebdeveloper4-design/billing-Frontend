import { baseApi } from '../baseApi';

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. GET /api/orders (supports ?customerId=...&status=...&search=...&page=1&limit=50)
    getOrders: builder.query({
      query: (params = {}) => ({
        url: '/orders',
        method: 'GET',
        params,
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Order', id: _id })),
              { type: 'Order', id: 'LIST' },
            ]
          : [{ type: 'Order', id: 'LIST' }],
    }),

    // 2. GET /api/orders/:id
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),

    // 3. GET /api/orders/customer/:customerId
    getOrdersByCustomer: builder.query({
      query: (customerId) => `/orders/customer/${customerId}`,
      providesTags: (result, error, customerId) => [
        { type: 'Order', id: `CUSTOMER_${customerId}` },
        { type: 'Order', id: 'LIST' },
      ],
    }),

    // 4. POST /api/orders (Create order)
    createOrder: builder.mutation({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Order', id: 'LIST' },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 5. PUT /api/orders/:id (Update order)
    updateOrder: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/orders/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 6. DELETE /api/orders/:id (Delete order & associated products)
    deleteOrder: builder.mutation({
      query: (id) => ({
        url: `/orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Order', id: 'LIST' },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 7. POST /api/orders/:id/payments (Record payment on order)
    recordOrderPayment: builder.mutation({
      query: ({ orderId, id, ...body }) => ({
        url: `/orders/${orderId || id}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { orderId, id }) => [
        { type: 'Order', id: orderId || id },
        { type: 'Order', id: 'LIST' },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'CustomerProduct', id: `ORDER_${orderId || id}` },
        { type: 'CustomerProduct', id: 'GROUPED' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 8. DELETE /api/orders/:id/payments/:paymentId (Delete payment on order)
    deleteOrderPayment: builder.mutation({
      query: ({ orderId, paymentId }) => ({
        url: `/orders/${orderId}/payments/${paymentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: 'LIST' },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'Renewal', id: 'LIST' },
      ],
    }),

    // 9. GET /api/orders/management (Order management stats & renewal list)
    getOrderManagementData: builder.query({
      query: (params = {}) => ({
        url: '/orders/management',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'Order', id: 'MANAGEMENT' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetOrdersQuery,
  useLazyGetOrdersQuery,
  useGetOrderByIdQuery,
  useLazyGetOrderByIdQuery,
  useGetOrdersByCustomerQuery,
  useLazyGetOrdersByCustomerQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useDeleteOrderMutation,
  useRecordOrderPaymentMutation,
  useDeleteOrderPaymentMutation,
  useGetOrderManagementDataQuery,
  useLazyGetOrderManagementDataQuery,
} = orderApi;
