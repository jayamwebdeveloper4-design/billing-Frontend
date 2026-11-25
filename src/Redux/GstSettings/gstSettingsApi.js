import { baseApi } from '../baseApi';

export const gstSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/gst-settings
    getGstSettings: builder.query({
      query: () => ({
        url: '/gst-settings',
        method: 'GET',
      }),
      providesTags: ['GstSettings'],
    }),

    // PUT /api/gst-settings
    updateGstSettings: builder.mutation({
      query: (body) => ({
        url: '/gst-settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['GstSettings'],
    }),

    // POST /api/gst-settings/upload
    uploadSignatureImage: builder.mutation({
      query: (formData) => ({
        url: '/gst-settings/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['GstSettings'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetGstSettingsQuery,
  useLazyGetGstSettingsQuery,
  useUpdateGstSettingsMutation,
  useUploadSignatureImageMutation,
} = gstSettingsApi;
