import Cookies from 'js-cookie';
import { baseApi } from '../baseApi';

export const backupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/backup/list
    listServerBackups: builder.query({
      query: () => ({
        url: '/backup/list',
        method: 'GET',
      }),
      providesTags: ['Backup'],
    }),

    // POST /api/backup/create
    createServerBackup: builder.mutation({
      query: () => ({
        url: '/backup/create',
        method: 'POST',
      }),
      invalidatesTags: ['Backup'],
    }),

    // POST /api/backup/restore-upload
    uploadAndRestoreBackup: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('backupFile', file);
        return {
          url: '/backup/restore-upload',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Backup'],
    }),

    // POST /api/backup/restore-file
    restoreFromServerFile: builder.mutation({
      query: (filename) => ({
        url: '/backup/restore-file',
        method: 'POST',
        body: { filename },
      }),
      invalidatesTags: ['Backup'],
    }),

    // POST /api/backup/upload
    uploadBackupToServer: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('backupFile', file);
        return {
          url: '/backup/upload',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Backup'],
    }),

    // DELETE /api/backup/delete-file/:filename
    deleteServerBackupFile: builder.mutation({
      query: (filename) => ({
        url: `/backup/delete-file/${encodeURIComponent(filename)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Backup'],
    }),
  }),
  overrideExisting: true,
});

// Helper for direct database backup download
export const downloadDatabaseBackup = async () => {
  const token = Cookies.get('billing_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const res = await fetch(`${baseUrl}/backup/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  const nowStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `JayamBilling_Backup_${nowStr}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
  return true;
};

// Helper for downloading a specific historical backup
export const downloadServerBackupFile = async (filename) => {
  const token = Cookies.get('billing_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const res = await fetch(`${baseUrl}/backup/download-file/${encodeURIComponent(filename)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
  return true;
};

export const {
  useListServerBackupsQuery,
  useLazyListServerBackupsQuery,
  useCreateServerBackupMutation,
  useUploadAndRestoreBackupMutation,
  useRestoreFromServerFileMutation,
  useUploadBackupToServerMutation,
  useDeleteServerBackupFileMutation,
} = backupApi;
