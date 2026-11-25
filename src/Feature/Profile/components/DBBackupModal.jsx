import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  DatabaseBackup,
  Download,
  Upload,
  AlertTriangle,
  RotateCcw,
  Clock,
  HardDrive,
  X,
  Trash2,
  FileCode2,
} from "lucide-react";

import Button from "../../../UI/Components/Button";
import InputFeild from "../../../UI/Components/InputFeild";
import {
  downloadDatabaseBackup,
  downloadServerBackupFile,
  useListServerBackupsQuery,
  useCreateServerBackupMutation,
  useUploadBackupToServerMutation,
  useRestoreFromServerFileMutation,
  useDeleteServerBackupFileMutation,
} from "../../../Redux/Backup";

export const DBBackupModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { data: backupsData, isLoading: loadingBackups, refetch: fetchBackups } =
    useListServerBackupsQuery(undefined, { skip: !isOpen });
  const [createServerBackupMutation] = useCreateServerBackupMutation();
  const [uploadBackupToServerMutation] = useUploadBackupToServerMutation();
  const [restoreFromServerFileMutation] = useRestoreFromServerFileMutation();
  const [deleteServerBackupFileMutation] = useDeleteServerBackupFileMutation();

  const [creatingBackup, setCreatingBackup] = useState(false);
  const [downloadToPcAlso, setDownloadToPcAlso] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileForRestore, setSelectedFileForRestore] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState(null);

  const uploadInputRef = useRef(null);
  const serverBackups = backupsData?.backups || [];

  // 1. GET BACKUP: Creates backup in backend folder + Optional to Download
  const handleGetBackup = async () => {
    setCreatingBackup(true);
    const toastId = toast.loading("Extracting data from DB and saving to backup folder...");
    try {
      if (downloadToPcAlso) {
        await downloadDatabaseBackup();
        toast.success("Backup saved to backend folder & downloaded to your PC!", { id: toastId });
      } else {
        const result = await createServerBackupMutation().unwrap();
        toast.success(`Backup saved to backend folder: ${result?.filename || 'Saved'}`, { id: toastId });
      }
      await fetchBackups();
    } catch (error) {
      console.error("Backup creation error:", error);
      toast.error(error?.data?.message || error?.message || "Failed to create backup", { id: toastId });
    } finally {
      setCreatingBackup(false);
    }
  };

  // 2. UPLOAD BACKUP: Uploads custom backup file into backend folder
  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Please upload a valid .json backup file");
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name} to backend backup folder...`);
    try {
      const result = await uploadBackupToServerMutation(file).unwrap();
      toast.success(result?.message || "File uploaded successfully to backup folder!", { id: toastId });
      await fetchBackups();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error?.data?.message || error?.message || "Failed to upload backup file", { id: toastId });
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  // 3. ROW ACTION: Download specific file from history to PC
  const handleDownloadFile = async (filename) => {
    const toastId = toast.loading(`Downloading ${filename}...`);
    try {
      await downloadServerBackupFile(filename);
      toast.success("File downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Download file error:", error);
      toast.error("Failed to download file", { id: toastId });
    }
  };

  // 4. ROW ACTION: Restore DB from selected history file
  const handleConfirmRestore = async () => {
    if (!selectedFileForRestore) return;
    if (confirmText.trim().toUpperCase() !== "RESTORE") {
      toast.error("Please type RESTORE to confirm this operation");
      return;
    }

    setRestoring(true);
    const toastId = toast.loading(`Restoring database from ${selectedFileForRestore}...`);
    try {
      const result = await restoreFromServerFileMutation(selectedFileForRestore).unwrap();
      toast.success(result?.message || "Database restored successfully!", { id: toastId });
      setSelectedFileForRestore(null);
      setConfirmText("");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Restore error:", error);
      toast.error(error?.data?.message || error?.message || "Restoration failed", { id: toastId });
    } finally {
      setRestoring(false);
    }
  };

  // 5. ROW ACTION: Delete backup file from server
  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" from the backend folder?`)) {
      return;
    }

    setDeletingFilename(filename);
    try {
      await deleteServerBackupFileMutation(filename).unwrap();
      toast.success(`Deleted ${filename}`);
      await fetchBackups();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error?.data?.message || error?.message || "Failed to delete backup file");
    } finally {
      setDeletingFilename(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-[840px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <DatabaseBackup className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Database Backup & Restore Manager</h2>
              <p className="text-xs text-gray-500">Full database snapshot and safeguard across all collections</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TOP OPERATIONS PANEL: Get Backup + Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OPERATION 1: GET BACKUP */}
            <div className="p-4 rounded-xl border border-gray-200/90 bg-gray-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    <span>Get Backup</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    Live DB
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Extracts a complete snapshot from the database and stores it in the backend backup directory.
                </p>
              </div>

              {/* Optional To Download Checkbox */}
              <div className="space-y-3 pt-2 border-t border-gray-200/60">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={downloadToPcAlso}
                    onChange={(e) => setDownloadToPcAlso(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-700">
                    Also download a copy to my PC
                  </span>
                </label>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={downloadToPcAlso ? Download : HardDrive}
                  loading={creatingBackup}
                  onClick={handleGetBackup}
                  className="w-full"
                >
                  {downloadToPcAlso ? "Get Backup & Download" : "Save Backup to Backend"}
                </Button>
              </div>
            </div>

            {/* OPERATION 2: UPLOAD BACKUP */}
            <div className="p-4 rounded-xl border border-gray-200/90 bg-gray-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Upload Backup</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                    .JSON
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Upload an external snapshot file to store in the backend backup directory for instant restoration.
                </p>
              </div>

              <div className="pt-2 border-t border-gray-200/60">
                <input
                  type="file"
                  ref={uploadInputRef}
                  onChange={handleUploadFile}
                  accept=".json,application/json"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  icon={Upload}
                  loading={uploading}
                  onClick={() => uploadInputRef.current?.click()}
                  className="w-full"
                >
                  Choose .JSON File to Upload
                </Button>
              </div>
            </div>
          </div>

          {/* CENTRAL SECTION: List Backups from history (Backend Folder) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Backup History
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 font-bold text-gray-600">
                  {serverBackups.length}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchBackups}
                disabled={loadingBackups}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Refresh List
              </Button>
            </div>

            {loadingBackups ? (
              <div className="py-12 text-center text-xs text-gray-500 bg-gray-50/50 rounded-xl border border-gray-200/80">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Reading backup files from backend...
              </div>
            ) : serverBackups.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500 italic bg-gray-50/50 rounded-xl border border-gray-200/80">
                No backup files currently stored in backend folder.
              </div>
            ) : (
              <div className="border border-gray-200/90 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Backup File</th>
                        <th className="px-4 py-3">Date Created</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {serverBackups.map((b) => (
                        <tr key={b.filename} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] font-bold text-gray-900">
                            <div className="flex items-center gap-2 truncate max-w-[260px]" title={b.filename}>
                              <FileCode2 className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="truncate">{b.filename}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-[11px] whitespace-nowrap">
                            {b.createdAt ? new Date(b.createdAt).toLocaleString("en-GB") : "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800 text-[11px] whitespace-nowrap">
                            {b.sizeFormatted || `${(b.size / 1024).toFixed(1)} KB`}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* DOWNLOAD BUTTON */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                icon={Download}
                                onClick={() => handleDownloadFile(b.filename)}
                                title="Download this backup to your computer"
                              >
                                Download
                              </Button>

                              {/* RESTORE BUTTON */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                icon={RotateCcw}
                                onClick={() => {
                                  setSelectedFileForRestore(b.filename);
                                  setConfirmText("");
                                }}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                title="Restore database using this backup"
                              >
                                Restore
                              </Button>

                              {/* DELETE BUTTON */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={() => handleDeleteFile(b.filename)}
                                disabled={deletingFilename === b.filename}
                                className="text-gray-400 hover:text-red-600"
                                title="Delete this file from backend"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* RESTORE SAFETY CONFIRMATION DIALOG (When user clicks 'Restore') */}
          {selectedFileForRestore && (
            <div className="p-5 rounded-xl bg-red-50/70 border border-red-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 text-sm font-bold text-red-700">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Confirm Database Restoration</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                You are about to restore the database using snapshot:{" "}
                <strong className="font-mono text-red-700">{selectedFileForRestore}</strong>.
                <br />
                <span className="text-gray-500 font-medium">
                  ⚠️ This action will overwrite and replace existing database records with the snapshot from this file.
                </span>
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-700 tracking-wider">
                  Type <span className="text-red-600 font-black">RESTORE</span> in capital letters to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type RESTORE"
                  className="w-full px-3.5 py-2.5 bg-white border border-red-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-600 outline-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setSelectedFileForRestore(null);
                    setConfirmText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  icon={RotateCcw}
                  loading={restoring}
                  disabled={confirmText.trim().toUpperCase() !== "RESTORE"}
                  onClick={handleConfirmRestore}
                >
                  Execute Restore to DB
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DBBackupModal;
