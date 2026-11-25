import { baseApi } from '../baseApi';

export const renewalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. GET /api/renewals (supports month, year, deactive, section, nMonths, page, limit)
    getRenewals: builder.query({
      query: (params = {}) => ({
        url: '/renewals',
        method: 'GET',
        params,
      }),
      providesTags: (result) =>
        result?.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Renewal', id: _id })),
              { type: 'Renewal', id: 'LIST' },
            ]
          : [{ type: 'Renewal', id: 'LIST' }],
    }),

    // 2. GET /api/renewals/plan
    getRenewalPlan: builder.query({
      query: (params = {}) => ({
        url: '/renewals/plan',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'RenewalPlan', id: 'STATS' }],
    }),

    // 3. PATCH /api/renewals/:id/status
    updateRenewalStatus: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/renewals/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Renewal', id },
        { type: 'Renewal', id: 'LIST' },
        { type: 'RenewalPlan', id: 'STATS' },
        { type: 'CustomerProduct', id: 'LIST' },
      ],
    }),

    // 4. POST /api/renewals/:id/renew
    executeRenewal: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/renewals/${id}/renew`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Renewal', id },
        { type: 'Renewal', id: 'LIST' },
        { type: 'RenewalPlan', id: 'STATS' },
        { type: 'CustomerProduct', id: 'LIST' },
        { type: 'CustomerProduct', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),

    // 5. POST /api/reminders/:id or POST /api/reminders/send-email
    sendRenewalReminder: builder.mutation({
      query: ({ id, ...body }) => ({
        url: id ? `/reminders/${id}` : '/reminders/send-email',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Reminder', id },
        { type: 'Reminder', id: 'LIST' },
        { type: 'Renewal', id },
        { type: 'Renewal', id: 'LIST' },
        { type: 'CustomerProduct', id: 'LIST' },
      ],
    }),

    // 6. GET /api/reminders/:id/status
    getReminderStatus: builder.query({
      query: (id) => `/reminders/${id}/status`,
      providesTags: (result, error, id) => [
        { type: 'Reminder', id: `STATUS_${id}` },
        { type: 'Renewal', id: `REMINDER_${id}` },
      ],
    }),

    // 7. POST /api/reminders/bulk
    bulkSendReminders: builder.mutation({
      query: (body) => ({
        url: '/reminders/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Reminder', id: 'LIST' },
        { type: 'Renewal', id: 'LIST' },
        { type: 'CustomerProduct', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetRenewalsQuery,
  useGetRenewalPlanQuery,
  useUpdateRenewalStatusMutation,
  useExecuteRenewalMutation,
  useSendRenewalReminderMutation,
  useGetReminderStatusQuery,
  useBulkSendRemindersMutation,
} = renewalApi;
