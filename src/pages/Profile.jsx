import React, { useState, useEffect } from 'react'
import { getAdminProfile, updateAdminProfile } from '../api/userApi'
import toast from 'react-hot-toast'

const Profile = () => {
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
  })
  const [loading, setLoading] = useState(true)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [originalData, setOriginalData] = useState({ username: '', email: '' })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await getAdminProfile()
      setProfileData({
        username: data.username,
        email: data.email
      })
      setOriginalData({
        username: data.username,
        email: data.email
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    try {
      const trimmedUsername = profileData.username.trim()
      const trimmedEmail = profileData.email.trim()
      await updateAdminProfile({
        username: trimmedUsername,
        email: trimmedEmail
      })
      setOriginalData({
        username: trimmedUsername,
        email: trimmedEmail
      })
      setIsEditingProfile(false)
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  if (loading) {
    return <div className="p-xl text-center">Loading profile...</div>
  }

  return (
    <div className="max-w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl md:text-h1 font-bold text-on-surface mb-lg md:mb-xl">Profile</h1>
      
      <div className="max-w-2xl space-y-lg">
        {/* Profile Details Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md md:p-xl shadow-sm">
          <div className="flex items-center justify-between mb-lg md:mb-xl">
            <div className="flex items-center gap-sm text-primary">
              <span className="material-symbols-outlined text-[24px] md:text-[28px]">account_circle</span>
              <h3 className="text-lg md:text-h3 font-bold text-on-surface truncate">Profile Details</h3>
            </div>
            <button 
              type="button"
              onClick={() => {
                if (isEditingProfile) {
                  setProfileData({ ...originalData })
                }
                setIsEditingProfile(!isEditingProfile)
              }}
              className={`px-md py-xs rounded-lg font-bold text-body-sm transition-all flex items-center gap-xs cursor-pointer ${
                isEditingProfile 
                ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest' 
                : 'text-primary hover:bg-primary/10'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isEditingProfile ? 'close' : 'edit'}
              </span>
              {isEditingProfile ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-md md:space-y-xl">
            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Username</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">person</span>
                <input 
                  disabled={!isEditingProfile}
                  className={`w-full border rounded-xl pl-[44px] pr-[16px] py-3 md:py-md font-body-md focus:ring-2 focus:ring-primary outline-none transition-all text-sm md:text-body-md ${
                    isEditingProfile 
                    ? 'bg-surface-container-low border-outline-variant shadow-inner' 
                    : 'bg-on-background/5 border-transparent cursor-not-allowed opacity-70'
                  }`} 
                  placeholder="Enter username"
                  type="text" 
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">mail</span>
                <input 
                  disabled={!isEditingProfile}
                  className={`w-full border rounded-xl pl-[44px] pr-[16px] py-3 md:py-md font-body-md focus:ring-2 focus:ring-primary outline-none transition-all text-sm md:text-body-md ${
                    isEditingProfile 
                    ? 'bg-surface-container-low border-outline-variant shadow-inner' 
                    : 'bg-on-background/5 border-transparent cursor-not-allowed opacity-70'
                  }`} 
                  placeholder="Enter email address"
                  type="email" 
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                />
              </div>
            </div>

            {isEditingProfile && (
              <div className="flex justify-end pt-md">
                <button 
                  type="submit" 
                  disabled={isUpdatingProfile || !profileData.username || !profileData.email}
                  className="bg-primary text-on-primary px-xl py-md rounded-xl font-bold transition-all hover:brightness-110 active:scale-[0.98] shadow-md flex items-center gap-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-body-md"
                >
                  {isUpdatingProfile ? (
                    <div className="flex items-center gap-sm">
                      <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Passwordless Security Status Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md md:p-xl shadow-sm">
          <div className="flex items-center gap-sm text-primary mb-md">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
            <h3 className="text-lg font-bold text-on-surface">Passwordless Security</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-md">
            Your account is secured via self-hosted one-time password (OTP) verification sent directly to your registered email address. Passwords have been safely decommissioned.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <span className="material-symbols-outlined text-sm">shield</span>
            <span>Active Protection • Redis HMAC Hash Throttled</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Profile
