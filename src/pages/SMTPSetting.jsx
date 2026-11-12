import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { getSmtpSettings, updateSmtpSettings } from '../api/smtpApi'

const INITIAL_SETTINGS = {
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpFromName: '',
    smtpEncryption: 'tls',
    testEmail: '',
    isEnabled: true
}

const SMTPSetting = () => {
    const [settingsData, setSettingsData] = useState(INITIAL_SETTINGS)
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
    const [isTestingConnection, setIsTestingConnection] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Store the last-saved snapshot to detect real changes
    const savedSettings = useRef(INITIAL_SETTINGS)

    useEffect(() => {
        fetchSmtpSettings()
    }, [])

    // Accurately track whether the form diverges from saved state
    useEffect(() => {
        const changed = Object.keys(savedSettings.current).some(
            key => settingsData[key] !== savedSettings.current[key]
        )
        setHasChanges(changed)
    }, [settingsData])

    const fetchSmtpSettings = async () => {
        try {
            // getSmtpSettings returns data directly (not a Response object)
            const data = await getSmtpSettings()
            if (data) {
                const merged = { ...INITIAL_SETTINGS, ...data }
                setSettingsData(merged)
                savedSettings.current = merged
            }
        } catch (error) {
            console.error('Error fetching SMTP settings:', error)
        }
    }

    const handleChange = (field, value) => {
        setSettingsData(prev => ({ ...prev, [field]: value }))
    }

    const handleUpdateSettings = async (e) => {
        e.preventDefault()
        setIsUpdatingSettings(true)

        try {
            // updateSmtpSettings returns data directly (not a Response object)
            const data = await updateSmtpSettings(settingsData)
            toast.success('SMTP settings saved successfully!')
            const merged = { ...settingsData, ...data }
            setSettingsData(merged)
            savedSettings.current = merged
            setHasChanges(false)
        } catch (error) {
            console.error('Error saving SMTP settings:', error)
            toast.error(error?.message || 'Failed to save SMTP settings')
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    const handleTestConnection = async (e) => {
        e.preventDefault()
        setIsTestingConnection(true)

        try {
            // Use the dedicated API helper instead of a hardcoded fetch
            const data = await testSmtpConnection({
                email: settingsData.testEmail || settingsData.smtpFromEmail,
                settings: settingsData
            })
            toast.success(data?.message || 'Test email sent successfully!')
        } catch (error) {
            console.error('Error testing SMTP connection:', error)
            toast.error(error?.message || 'Failed to send test email')
        } finally {
            setIsTestingConnection(false)
        }
    }

    const encryptionOptions = [
        { value: 'tls', label: 'TLS' },
        { value: 'ssl', label: 'SSL' },
        { value: 'none', label: 'None' }
    ]

    return (
        <div className="max-w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl md:text-h1 font-bold text-on-surface mb-lg md:mb-xl">SMTP Settings</h1>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md md:p-xl shadow-sm">
                <form onSubmit={handleUpdateSettings} className="space-y-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">

                        {/* SMTP Host */}
                        <div className="space-y-sm">
                            <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                SMTP Host <span className="text-error">*</span>
                            </label>
                            <input
                                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                                type="text"
                                value={settingsData.smtpHost}
                                onChange={(e) => handleChange('smtpHost', e.target.value)}
                                placeholder="E.g., smtp.gmail.com"
                                required
                            />
                        </div>

                        {/* SMTP Port */}
                        <div className="space-y-sm">
                            <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                SMTP Port <span className="text-error">*</span>
                            </label>
                            <input
                                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                                type="number"
                                value={settingsData.smtpPort}
                                onChange={(e) => handleChange('smtpPort', Number(e.target.value))}
                                placeholder="E.g., 587"
                                required
                            />
                        </div>

                        {/* SMTP Encryption */}
                        <div className="space-y-sm">
                            <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                Encryption <span className="text-error">*</span>
                            </label>
                            <select
                                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant appearance-none"
                                value={settingsData.smtpEncryption}
                                onChange={(e) => handleChange('smtpEncryption', e.target.value)}
                                required
                            // Removed: disabled={true} and cursor-not-allowed — enable if intentionally locked
                            >
                                {encryptionOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* SMTP Username */}
                        <div className="space-y-sm">
                            <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                Username <span className="text-error">*</span>
                            </label>
                            <input
                                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                                type="text"
                                value={settingsData.smtpUsername}
                                onChange={(e) => handleChange('smtpUsername', e.target.value)}
                                placeholder="E.g., your-email@gmail.com"
                                required
                            />
                        </div>

                        {/* SMTP Password */}
                        <div className="space-y-sm">
                            <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                Password <span className="text-error">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    className="w-full border rounded-xl px-md py-3 pr-10 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                                    type={showPassword ? 'text' : 'password'}
                                    value={settingsData.smtpPassword}
                                    onChange={(e) => handleChange('smtpPassword', e.target.value)}
                                    placeholder="Enter SMTP password"
                                    required
                                />
                                {/* Fixed: uncommented and wired up correctly */}
                                <button
                                    type="button"
                                    className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                                    onClick={() => setShowPassword(prev => !prev)}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* From Email */}
                        <div className="space-y-sm">
                            <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                From Email <span className="text-error">*</span>
                            </label>
                            <input
                                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                                type="email"
                                value={settingsData.smtpFromEmail}
                                onChange={(e) => handleChange('smtpFromEmail', e.target.value)}
                                placeholder="E.g., noreply@yourdomain.com"
                                required
                            />
                        </div>

                        {/* From Name */}
                        <div className="space-y-sm">
                            <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                From Name <span className="text-error">*</span>
                            </label>
                            <input
                                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                                type="text"
                                value={settingsData.smtpFromName}
                                onChange={(e) => handleChange('smtpFromName', e.target.value)}
                                placeholder="E.g., Your Company Name"
                                required
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col md:flex-row gap-md pt-md border-t border-outline-variant/30">
                        <button
                            type="submit"
                            disabled={isUpdatingSettings || !hasChanges}
                            className="flex-1 bg-primary text-on-primary py-3 md:py-md rounded-xl font-bold transition-all hover:brightness-110 active:scale-[0.98] shadow-md flex items-center justify-center gap-sm disabled:opacity-80 disabled:grayscale disabled:cursor-not-allowed text-sm md:text-body-md"
                        >
                            {isUpdatingSettings ? (
                                <div className="flex items-center gap-sm">
                                    <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span>Saving...</span>
                                </div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">save</span>
                                    Save SMTP Settings
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SMTPSetting