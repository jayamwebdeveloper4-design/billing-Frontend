import { baseApi } from '../baseApi';

export const templateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/templates/:name
    getTemplate: builder.query({
      query: (name) => ({
        url: `/templates/${name}`,
        method: 'GET',
      }),
      providesTags: (result, error, name) => [{ type: 'Template', id: name }],
    }),

    // POST /api/templates
    saveTemplate: builder.mutation({
      query: (templateData) => ({
        url: '/templates',
        method: 'POST',
        body: templateData,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Template', id: arg?.name },
        { type: 'Template', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetTemplateQuery,
  useLazyGetTemplateQuery,
  useSaveTemplateMutation,
} = templateApi;
