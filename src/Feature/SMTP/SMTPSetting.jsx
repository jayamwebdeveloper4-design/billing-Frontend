import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Save, Send, Eye, EyeOff, MailCheck, Loader2 } from 'lucide-react';
import Header from '../../UI/LayoutComponents/Header';
import Button from '../../UI/Components/Button';
import InputFeild from '../../UI/Components/InputFeild';
import {
    useGetSmtpSettingsQuery,
    useUpdateSmtpSettingsMutation,
    useTestSmtpConnectionMutation
} from '../../Redux/Smtp';

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
};

const CONFIG_FIELDS = [
    'smtpHost',
    'smtpPort',
    'smtpUsername',
    'smtpPassword',
    'smtpFromEmail',
    'smtpFromName',
    'smtpEncryption'
];

export const SMTPSetting = () => {
    const [settingsData, setSettingsData] = useState(INITIAL_SETTINGS);
    const [hasChanges, setHasChanges] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // RTK Query Hooks
    const { data: smtpData, isLoading, isError, error: fetchError } = useGetSmtpSettingsQuery();
    const [updateSmtpSettings, { isLoading: isUpdatingSettings }] = useUpdateSmtpSettingsMutation();
    const [testSmtpConnection, { isLoading: isTestingConnection }] = useTestSmtpConnectionMutation();

    // Store the last-saved snapshot to detect real changes
    const savedSettings = useRef(INITIAL_SETTINGS);

    useEffect(() => {
        if (smtpData) {
            const merged = { ...INITIAL_SETTINGS, ...smtpData };
            setSettingsData(merged);
            savedSettings.current = merged;
        }
    }, [smtpData]);

    useEffect(() => {
        if (isError && fetchError) {
            console.error('Error fetching SMTP settings:', fetchError);
            toast.error(fetchError?.data?.message || 'Failed to load SMTP settings');
        }
    }, [isError, fetchError]);

    // Accurately track whether the form diverges from saved state on configuration fields
    useEffect(() => {
        const changed = CONFIG_FIELDS.some(
            key => String(settingsData[key] ?? '') !== String(savedSettings.current[key] ?? '')
        );
        setHasChanges(changed);
    }, [settingsData]);

    const handleChange = (field, value) => {
        setSettingsData(prev => ({ ...prev, [field]: value }));
    };

    const handleEncryptionChange = (encryption) => {
        setSettingsData(prev => {
            let port = prev.smtpPort;
            if (encryption === 'ssl' && (port === 587 || port === 25 || !port)) {
                port = 465;
            } else if (encryption === 'tls' && (port === 465 || port === 25 || !port)) {
                port = 587;
            } else if (encryption === 'none' && (port === 465 || port === 587 || !port)) {
                port = 25;
            }
            return {
                ...prev,
                smtpEncryption: encryption,
                smtpPort: port,
                secure: encryption === 'ssl' || Number(port) === 465
            };
        });
    };

    const handlePortChange = (value) => {
        const port = value === '' ? '' : Number(value);
        setSettingsData(prev => ({
            ...prev,
            smtpPort: port,
            secure: prev.smtpEncryption === 'ssl' || Number(port) === 465
        }));
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                ...settingsData,
                smtpPort: Number(settingsData.smtpPort) || 587,
                secure: settingsData.smtpEncryption === 'ssl' || Number(settingsData.smtpPort) === 465
            };
            const result = await updateSmtpSettings(payload).unwrap();
            toast.success('SMTP settings saved successfully!');
            const merged = { ...settingsData, ...result };
            setSettingsData(merged);
            savedSettings.current = merged;
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving SMTP settings:', error);
            toast.error(error?.data?.message || error?.message || 'Failed to save SMTP settings');
        }
    };

    const handleTestConnection = async (e) => {
        if (e) e.preventDefault();

        const recipient = (settingsData.testEmail || settingsData.smtpFromEmail || '').trim();
        if (!recipient) {
            toast.error('Please enter a recipient email to send the test email.');
            return;
        }

        if (!settingsData.smtpHost || !settingsData.smtpUsername) {
            toast.error('Please provide SMTP Host and Username before testing.');
            return;
        }

        try {
            const payload = {
                email: recipient,
                settings: {
                    ...settingsData,
                    smtpPort: Number(settingsData.smtpPort) || 587
                }
            };
            const result = await testSmtpConnection(payload).unwrap();
            toast.success(result?.message || `Test email sent successfully to ${recipient}!`);
        } catch (error) {
            console.error('Error testing SMTP connection:', error);
            toast.error(error?.data?.message || error?.message || 'Failed to send test email');
        }
    };

    const encryptionOptions = [
        { value: 'tls', label: 'TLS (Port 587)' },
        { value: 'ssl', label: 'SSL (Port 465)' },
        { value: 'none', label: 'None (Port 25)' }
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="w-8 h-8 text-[#0052cc] animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Loading SMTP settings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1440px] mx-auto p-2 md:p-2 space-y-6 animate-in fade-in duration-200">
            {/* Header UI component */}
            <Header
                title="SMTP Settings"
                subtitle="Configure your outgoing mail server settings for automated invoice delivery, renewal notices, and alerts."
            />

            {/* Main Form Card */}
            <div className="bg-white border border-gray-200/90 rounded-xl p-5 md:p-8 shadow-xs">
                <form onSubmit={handleUpdateSettings} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

                        {/* SMTP Host */}
                        <InputFeild
                            label="SMTP Host"
                            required
                            placeholder="e.g. smtp.gmail.com"
                            value={settingsData.smtpHost}
                            onChange={(e) => handleChange('smtpHost', e.target.value)}
                        />

                        {/* SMTP Encryption */}
                        <InputFeild
                            label="Encryption"
                            as="select"
                            required
                            value={settingsData.smtpEncryption}
                            onChange={(e) => handleEncryptionChange(e.target.value)}
                            options={encryptionOptions}
                        />

                        {/* SMTP Port */}
                        <InputFeild
                            label="SMTP Port"
                            type="number"
                            required
                            placeholder="e.g. 587"
                            value={settingsData.smtpPort}
                            onChange={(e) => handlePortChange(e.target.value)}
                        />

                        {/* SMTP Username */}
                        <InputFeild
                            label="Username / Email"
                            required
                            placeholder="e.g. your-email@gmail.com"
                            value={settingsData.smtpUsername}
                            onChange={(e) => handleChange('smtpUsername', e.target.value)}
                        />

                        {/* SMTP Password */}
                        <InputFeild
                            label="Password / App Password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Enter SMTP password"
                            value={settingsData.smtpPassword}
                            onChange={(e) => handleChange('smtpPassword', e.target.value)}
                            rightElement={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />

                        {/* From Email */}
                        <InputFeild
                            label="From Email"
                            type="email"
                            required
                            placeholder="e.g. billing@jayamwebsolutions.com"
                            value={settingsData.smtpFromEmail}
                            onChange={(e) => handleChange('smtpFromEmail', e.target.value)}
                        />

                        {/* From Name */}
                        <div className="md:col-span-2">
                            <InputFeild
                                label="From Name"
                                required
                                placeholder="e.g. Jayam Web Solutions"
                                value={settingsData.smtpFromName}
                                onChange={(e) => handleChange('smtpFromName', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 justify-end">
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            icon={Save}
                            loading={isUpdatingSettings}
                            disabled={isUpdatingSettings || (!hasChanges && Boolean(savedSettings.current.smtpHost))}
                            className="w-full sm:w-auto"
                        >
                            Save SMTP Settings
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SMTPSetting;
