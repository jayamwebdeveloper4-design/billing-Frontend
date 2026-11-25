import { baseApi } from '../baseApi';

export const reminderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Send Single Renewal Reminder (POST /api/reminders/:id or /api/reminders/send-email)
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

    // 2. Check Reminder Eligibility (GET /api/reminders/:id/status)
    getReminderStatus: builder.query({
      query: (id) => `/reminders/${id}/status`,
      providesTags: (result, error, id) => [
        { type: 'Reminder', id: `STATUS_${id}` },
        { type: 'Renewal', id: `REMINDER_${id}` },
      ],
    }),

    // 3. Bulk Dispatch Reminders (POST /api/reminders/bulk)
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
  useSendRenewalReminderMutation,
  useGetReminderStatusQuery,
  useBulkSendRemindersMutation,
} = reminderApi;
