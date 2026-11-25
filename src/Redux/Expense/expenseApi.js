import { baseApi } from '../baseApi';

const pageSize = 50;

export const expenseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/expenses
    getExpenses: builder.query({
      query: ({ cursor, category, startDate, endDate, month, limit = pageSize } = {}) => {
        const params = { limit };
        if (cursor) params.cursor = cursor;
        if (category) params.category = category;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (month) params.month = month;
        return {
          url: '/expenses',
          method: 'GET',
          params,
        };
      },
      providesTags: (result) => {
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.expenses)
          ? result.expenses
          : Array.isArray(result?.data)
          ? result.data
          : [];
        return [
          ...list.map((item) => ({ type: 'Expense', id: item._id || item.id })),
          { type: 'Expense', id: 'LIST' },
        ];
      },
    }),

    // POST /api/expenses
    createExpense: builder.mutation({
      query: (arg) => {
        let body;
        if (arg instanceof FormData) {
          body = arg;
        } else {
          const { name, amount, category, date, receipt } = arg || {};
          const formData = new FormData();
          if (name) formData.append('name', name);
          if (amount !== undefined) formData.append('amount', amount);
          if (category) formData.append('category', category);
          if (date) formData.append('date', date);
          if (receipt) formData.append('receipt', receipt);
          body = formData;
        }
        return {
          url: '/expenses',
          method: 'POST',
          body,
        };
      },
      transformResponse: (response) => response?.expense || response,
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // PATCH /api/expenses/:id
    updateExpense: builder.mutation({
      query: ({ id, name, amount, category, date, paymentStatus }) => ({
        url: `/expenses/${id}`,
        method: 'PATCH',
        body: { name, amount, category, date, paymentStatus },
      }),
      transformResponse: (response) => response?.expense || response,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const getExpenseReceiptUrl = (receiptPath) => {
  if (!receiptPath) return '';
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const apiBase = new URL(baseUrl, window.location.origin);
  const basePath = apiBase.pathname.replace(/\/+$/, '');
  const relativePath = receiptPath.replace(/^\/+/, '');
  return `${apiBase.origin}${basePath}/${relativePath}`;
};

export const {
  useGetExpensesQuery,
  useLazyGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} = expenseApi;
