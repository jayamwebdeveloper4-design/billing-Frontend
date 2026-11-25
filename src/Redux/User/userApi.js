import { baseApi } from '../baseApi';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/auth/request-otp
    requestLoginOtp: builder.mutation({
      query: (email) => ({
        url: '/auth/request-otp',
        method: 'POST',
        body: typeof email === 'string' ? { email } : email,
      }),
    }),

    // POST /api/auth/verify-otp
    verifyLoginOtp: builder.mutation({
      query: ({ email, otp }) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body: { email, otp },
      }),
      invalidatesTags: ['User', 'AdminProfile'],
    }),

    // POST /api/auth/logout
    logoutAdmin: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'AdminProfile'],
    }),

    // GET /api/auth/profile
    getAdminProfile: builder.query({
      query: () => ({
        url: '/auth/profile',
        method: 'GET',
      }),
      providesTags: ['AdminProfile'],
    }),

    // PUT /api/auth/profile
    updateAdminProfile: builder.mutation({
      query: (profileData) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: profileData,
      }),
      invalidatesTags: ['AdminProfile'],
    }),

    // GET /api/auth/admin-email
    fetchAdminEmail: builder.query({
      query: () => ({
        url: '/auth/admin-email',
        method: 'GET',
      }),
      providesTags: ['AdminProfile'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useRequestLoginOtpMutation,
  useVerifyLoginOtpMutation,
  useLogoutAdminMutation,
  useGetAdminProfileQuery,
  useLazyGetAdminProfileQuery,
  useUpdateAdminProfileMutation,
  useFetchAdminEmailQuery,
  useLazyFetchAdminEmailQuery,
} = userApi;
