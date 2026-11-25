import { baseApi } from '../baseApi';

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. GET /api/products
    getProducts: builder.query({
      query: (params = {}) => ({
        url: '/products',
        method: 'GET',
        params,
      }),
      providesTags: (result) =>
        Array.isArray(result)
          ? [
              ...result.map(({ _id }) => ({ type: 'Product', id: _id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    // 2. POST /api/products (Create Category)
    createProduct: builder.mutation({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    // 3. PUT /api/products/:id (Update Category Name)
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    // 4. DELETE /api/products/:id (Delete Category)
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    // 5. POST /api/products/:categoryId/subcategories (Add Sub-Category)
    addSubCategory: builder.mutation({
      query: ({ categoryId, ...body }) => ({
        url: `/products/${categoryId}/subcategories`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'Product', id: categoryId },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    // 6. PUT /api/products/:categoryId/subcategories/:subCategoryId (Update Sub-Category & Plans)
    updateSubCategory: builder.mutation({
      query: ({ categoryId, subCategoryId, ...body }) => ({
        url: `/products/${categoryId}/subcategories/${subCategoryId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'Product', id: categoryId },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    // 7. DELETE /api/products/:categoryId/subcategories/:subCategoryId (Delete Sub-Category)
    deleteSubCategory: builder.mutation({
      query: ({ categoryId, subCategoryId }) => ({
        url: `/products/${categoryId}/subcategories/${subCategoryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'Product', id: categoryId },
        { type: 'Product', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useAddSubCategoryMutation,
  useUpdateSubCategoryMutation,
  useDeleteSubCategoryMutation,
} = productApi;
