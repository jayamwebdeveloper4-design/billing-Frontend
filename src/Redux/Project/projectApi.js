import { baseApi } from '../baseApi';

export const projectApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/projectTool
    getProjects: builder.query({
      query: (params) => ({
        url: '/projectTool',
        method: 'GET',
        params,
      }),
      providesTags: ['Project'],
    }),

    // POST /api/projectTool
    createProject: builder.mutation({
      query: (productData) => ({
        url: '/projectTool',
        method: 'POST',
        body: productData,
      }),
      invalidatesTags: ['Project'],
    }),

    // GET /api/projectTool/timesheets
    getProjectTimesheet: builder.query({
      query: ({
        view,
        cursor,
        employeeId,
        projectId,
        startDate,
        endDate,
        month,
        year,
      } = {}) => ({
        url: '/projectTool/timesheets',
        method: 'GET',
        params: {
          view,
          limit: 50,
          ...(cursor ? { cursor } : {}),
          ...(employeeId ? { employeeId } : {}),
          ...(projectId ? { projectId } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(month ? { month } : {}),
          ...(year ? { year } : {}),
        },
      }),
      providesTags: ['Timesheet'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetProjectsQuery,
  useLazyGetProjectsQuery,
  useCreateProjectMutation,
  useGetProjectTimesheetQuery,
  useLazyGetProjectTimesheetQuery,
} = projectApi;
