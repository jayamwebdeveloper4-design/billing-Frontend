import { baseApi } from '../baseApi';

export const smtpApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/smtp-settings
    getSmtpSettings: builder.query({
      query: () => ({
        url: '/smtp-settings',
        method: 'GET',
      }),
      providesTags: ['SmtpSettings'],
    }),

    // PUT /api/smtp-settings
    updateSmtpSettings: builder.mutation({
      query: (body) => ({
        url: '/smtp-settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['SmtpSettings', { type: 'Renewal', id: 'LIST' }],
    }),

    // POST /api/smtp-settings/test
    testSmtpConnection: builder.mutation({
      query: (body) => ({
        url: '/smtp-settings/test',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetSmtpSettingsQuery,
  useLazyGetSmtpSettingsQuery,
  useUpdateSmtpSettingsMutation,
  useTestSmtpConnectionMutation,
} = smtpApi;
