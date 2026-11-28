import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Pencil,
  X,
  Save,
  ShieldCheck,
  DatabaseBackup,
  ArrowRight,
  Loader2,
} from "lucide-react";

import Header from "../../UI/LayoutComponents/Header";
import Button from "../../UI/Components/Button";
import InputFeild from "../../UI/Components/InputFeild";
import DBBackupModal from "./components/DBBackupModal";
import {
  useGetAdminProfileQuery,
  useUpdateAdminProfileMutation,
} from "../../Redux/User";

export const Profile = () => {
  const { data: profileFromApi, isLoading: loading, refetch: fetchProfile } = useGetAdminProfileQuery();
  const [updateAdminProfileMutation, { isLoading: isUpdatingProfile }] = useUpdateAdminProfileMutation();

  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [originalData, setOriginalData] = useState({ username: "", email: "" });
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  useEffect(() => {
    if (profileFromApi) {
      setProfileData({
        username: profileFromApi.username || "",
        email: profileFromApi.email || "",
      });
      setOriginalData({
        username: profileFromApi.username || "",
        email: profileFromApi.email || "",
      });
    }
  }, [profileFromApi]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileData.username.trim() || !profileData.email.trim()) {
      toast.error("Username and email cannot be empty");
      return;
    }

    try {
      const trimmedUsername = profileData.username.trim();
      const trimmedEmail = profileData.email.trim();
      await updateAdminProfileMutation({
        username: trimmedUsername,
        email: trimmedEmail,
      }).unwrap();
      setOriginalData({
        username: trimmedUsername,
        email: trimmedEmail,
      });
      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Update failed");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500">Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header UI Component */}
      <Header
        title="Admin Profile"
        subtitle="Manage your administrator credentials and database snapshots."
      />

      <div className="max-w-2xl space-y-6">
        {/* Profile Details Card */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 md:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Personal Information</h3>
                <p className="text-xs text-gray-500">Your administrator account credentials</p>
              </div>
            </div>

            <Button
              type="button"
              variant={isEditingProfile ? "secondary" : "outline"}
              size="sm"
              icon={isEditingProfile ? X : Pencil}
              onClick={() => {
                if (isEditingProfile) {
                  setProfileData({ ...originalData });
                }
                setIsEditingProfile(!isEditingProfile);
              }}
            >
              {isEditingProfile ? "Cancel" : "Edit Profile"}
            </Button>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <InputFeild
              label="Username"
              required
              disabled={!isEditingProfile}
              value={profileData.username}
              onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
              placeholder="Enter your username"
              leftElement={<User className="w-4 h-4 text-gray-400" />}
            />

            <InputFeild
              label="Email Address"
              type="email"
              required
              disabled={!isEditingProfile}
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              placeholder="Enter your email address"
              leftElement={<Mail className="w-4 h-4 text-gray-400" />}
            />

            {isEditingProfile && (
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={Save}
                  loading={isUpdatingProfile}
                  disabled={!profileData.username.trim() || !profileData.email.trim()}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Passwordless Security Status Card */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 md:p-7 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Passwordless Security</h3>
              <p className="text-xs text-gray-500">Enhanced protection via OTP verification</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Your account is secured via self-hosted one-time password (OTP) verification sent directly to your registered email address. Passwords have been safely decommissioned.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Active Protection • Redis HMAC Hash Throttled</span>
          </div>
        </div>

        {/* Database Backup Card */}
        <div
          onClick={() => setIsBackupModalOpen(true)}
          className="group bg-white border border-gray-200/90 rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md hover:border-blue-500/40 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors duration-300">
              <DatabaseBackup className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Database Backup & Restore
            </h3>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
              Manage database snapshots, export backups, and restore your system whenever needed.
            </p>
            <ArrowRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </div>
      </div>

      {/* Database Backup Modal Component */}
      <DBBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
};

export default Profile;
