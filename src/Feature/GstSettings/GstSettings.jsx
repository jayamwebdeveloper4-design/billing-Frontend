import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Save,
  Upload,
  X,
  Receipt,
  Percent,
  Landmark,
  Wallet,
  FileSignature,
  Loader2,
  Building2,
} from 'lucide-react';

import Header from '../../UI/LayoutComponents/Header';
import Button from '../../UI/Components/Button';
import InputFeild from '../../UI/Components/InputFeild';
import {
  useGetGstSettingsQuery,
  useUpdateGstSettingsMutation,
  useUploadSignatureImageMutation,
} from '../../Redux/GstSettings';

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_URL || 'http://localhost:3006/billing';

const getSignatureSrc = (path) => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  return `${IMAGE_BASE_URL}/${path}`;
};

const defaultSettings = {
  companyName: '',
  companyNameWithoutGst: '',
  address: '',
  addressWithoutGst: '',
  phone: '',
  phoneWithoutGst: '',
  email: '',
  emailWithoutGst: '',
  gstin: '',
  cgstPercentage: 9,
  sgstPercentage: 9,
  igstPercentage: 18,
  signatureImage: '',
  bankAccountName: 'JAYAM TECHNOLOGIES',
  bankAccountNumber: '120035000004',
  bankName: 'Canara Bank',
  bankBranch: 'Perungalathur',
  bankIfsc: 'CNRB0003856',
  gpayNumber: '9840599789',
  bankAccountNameWithoutGst: 'Jayam Web Solutions',
  bankAccountNumberWithoutGst: '722473240',
  bankNameWithoutGst: 'Indian Bank',
  bankBranchWithoutGst: 'Tambaram West, Chennai',
  bankIfscWithoutGst: 'IDIB000T092',
  gpayNumberWithoutGst: '9677876445',
};

export const GstSettings = () => {
  const [settingsData, setSettingsData] = useState(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState(defaultSettings);

  // RTK Query hooks
  const { data: gstData, isLoading: loading, isError, error: fetchError } = useGetGstSettingsQuery();
  const [updateGstSettingsMutation, { isLoading: isUpdatingSettings }] = useUpdateGstSettingsMutation();
  const [uploadSignatureImageMutation] = useUploadSignatureImageMutation();

  useEffect(() => {
    if (gstData) {
      const mergedData = { ...defaultSettings, ...gstData };
      setSettingsData(mergedData);
      setOriginalSettings(mergedData);
    }
  }, [gstData]);

  useEffect(() => {
    if (isError && fetchError) {
      console.error('Error fetching GST settings:', fetchError);
      toast.error(fetchError?.data?.message || 'Failed to load GST settings');
    }
  }, [isError, fetchError]);

  const handleChange = (field, value) => {
    setSettingsData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateGstSettingsMutation(settingsData).unwrap();
      const merged = { ...settingsData, ...updated };
      setSettingsData(merged);
      setOriginalSettings(merged);
      toast.success('GST Settings updated successfully!');
    } catch (error) {
      toast.error(error?.data?.message || error?.message || 'Failed to update GST settings');
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file.');
        return;
      }

      const formData = new FormData();
      formData.append('signature', file);

      const toastId = toast.loading('Uploading signature...');
      try {
        const response = await uploadSignatureImageMutation(formData).unwrap();
        if (response && response.filePath) {
          setSettingsData((prev) => ({ ...prev, signatureImage: response.filePath }));
          toast.success('Signature uploaded successfully!', { id: toastId });
        } else {
          toast.error('Failed to get path for uploaded signature.', { id: toastId });
        }
      } catch (error) {
        console.error('Error uploading signature image:', error);
        toast.error(error?.data?.message || 'Failed to upload signature image.', { id: toastId });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-[#0052cc] animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading settings...</p>
      </div>
    );
  }

  const hasChanges = JSON.stringify(settingsData) !== JSON.stringify(originalSettings);

  return (
    <div className="max-w-[1440px] mx-auto p-2 md:p-2 space-y-6 animate-in fade-in duration-200">
      {/* Header UI component */}
      <Header
        title="GST & Company Settings"
        subtitle="Configure organization profiles, tax percentage breakdown, banking info, and authorized digital signature."
      />

      <div className="bg-white border border-gray-200/90 rounded-xl p-5 md:p-8 shadow-xs">
        <form onSubmit={handleUpdateSettings} className="space-y-8">

          {/* Section 1: Company Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-gray-900 font-bold text-base">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3>Company & Invoice Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <InputFeild
                label="Company Name (GST Invoice)"
                required
                placeholder="E.g., JAYAM TECHNOLOGIES"
                value={settingsData.companyName || ''}
                onChange={(e) => handleChange('companyName', e.target.value)}
              />

              <InputFeild
                label="Company Name (Without GST Invoice)"
                placeholder="E.g., JAYAM SOLUTIONS"
                value={settingsData.companyNameWithoutGst || ''}
                onChange={(e) => handleChange('companyNameWithoutGst', e.target.value)}
              />

              <InputFeild
                label="GSTIN"
                placeholder="E.g., 33AOXPL..."
                value={settingsData.gstin || ''}
                onChange={(e) => handleChange('gstin', e.target.value)}
              />

              <div className="hidden md:block" />

              <InputFeild
                label="Phone Number (GST Invoice)"
                required
                placeholder="E.g., +91 9677876445"
                value={settingsData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
              />

              <InputFeild
                label="Phone Number (Without GST Invoice)"
                placeholder="E.g., +91 9677876445"
                value={settingsData.phoneWithoutGst || ''}
                onChange={(e) => handleChange('phoneWithoutGst', e.target.value)}
              />

              <InputFeild
                label="Email Address (GST Invoice)"
                type="email"
                required
                placeholder="E.g., info@jayam.co.in"
                value={settingsData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
              />

              <InputFeild
                label="Email Address (Without GST Invoice)"
                type="email"
                placeholder="E.g., info@jayam.co.in"
                value={settingsData.emailWithoutGst || ''}
                onChange={(e) => handleChange('emailWithoutGst', e.target.value)}
              />

              <InputFeild
                label="Complete Address (GST Invoice)"
                as="textarea"
                rows={3}
                required
                placeholder="E.g., No. 1, First Floor..."
                value={settingsData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
              />

              <InputFeild
                label="Complete Address (Without GST Invoice)"
                as="textarea"
                rows={3}
                placeholder="E.g., No. 1, First Floor..."
                value={settingsData.addressWithoutGst || ''}
                onChange={(e) => handleChange('addressWithoutGst', e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Tax Configuration */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-gray-900 font-bold text-base">
              <Percent className="w-5 h-5 text-blue-600" />
              <h3>Tax Configuration</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
              <InputFeild
                label="CGST %"
                type="number"
                placeholder="9"
                value={settingsData.cgstPercentage ?? ''}
                onChange={(e) => handleChange('cgstPercentage', e.target.value === '' ? '' : Number(e.target.value))}
                rightElement={<span className="text-xs text-gray-500 font-semibold mr-1">%</span>}
              />

              <InputFeild
                label="SGST %"
                type="number"
                placeholder="9"
                value={settingsData.sgstPercentage ?? ''}
                onChange={(e) => handleChange('sgstPercentage', e.target.value === '' ? '' : Number(e.target.value))}
                rightElement={<span className="text-xs text-gray-500 font-semibold mr-1">%</span>}
              />

              <InputFeild
                label="IGST %"
                type="number"
                placeholder="18"
                value={settingsData.igstPercentage ?? ''}
                onChange={(e) => handleChange('igstPercentage', e.target.value === '' ? '' : Number(e.target.value))}
                rightElement={<span className="text-xs text-gray-500 font-semibold mr-1">%</span>}
              />
            </div>
          </div>

          {/* Section 3: Bank Details (With GST Invoice) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-gray-900 font-bold text-base">
              <Landmark className="w-5 h-5 text-blue-600" />
              <h3>Bank Details (With GST Invoice)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <InputFeild
                label="Account Name (With GST)"
                placeholder="E.g., JAYAM TECHNOLOGIES"
                value={settingsData.bankAccountName || ''}
                onChange={(e) => handleChange('bankAccountName', e.target.value)}
              />

              <InputFeild
                label="Account Number (With GST)"
                placeholder="E.g., 120035000004"
                value={settingsData.bankAccountNumber || ''}
                onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
              />

              <InputFeild
                label="Bank Name (With GST)"
                placeholder="E.g., Canara Bank"
                value={settingsData.bankName || ''}
                onChange={(e) => handleChange('bankName', e.target.value)}
              />

              <InputFeild
                label="Branch (With GST)"
                placeholder="E.g., Perungalathur"
                value={settingsData.bankBranch || ''}
                onChange={(e) => handleChange('bankBranch', e.target.value)}
              />

              <InputFeild
                label="IFSC Code (With GST)"
                placeholder="E.g., CNRB0003856"
                value={settingsData.bankIfsc || ''}
                onChange={(e) => handleChange('bankIfsc', e.target.value)}
              />

              <InputFeild
                label="GPay Number (With GST)"
                placeholder="E.g., 9840599789"
                value={settingsData.gpayNumber || ''}
                onChange={(e) => handleChange('gpayNumber', e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Bank Details (Without GST Invoice) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-gray-900 font-bold text-base">
              <Wallet className="w-5 h-5 text-blue-600" />
              <h3>Bank Details (Without GST Invoice)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <InputFeild
                label="Account Name (Without GST)"
                placeholder="E.g., Jayam Web Solutions"
                value={settingsData.bankAccountNameWithoutGst || ''}
                onChange={(e) => handleChange('bankAccountNameWithoutGst', e.target.value)}
              />

              <InputFeild
                label="Account Number (Without GST)"
                placeholder="E.g., 722473240"
                value={settingsData.bankAccountNumberWithoutGst || ''}
                onChange={(e) => handleChange('bankAccountNumberWithoutGst', e.target.value)}
              />

              <InputFeild
                label="Bank Name (Without GST)"
                placeholder="E.g., Indian Bank"
                value={settingsData.bankNameWithoutGst || ''}
                onChange={(e) => handleChange('bankNameWithoutGst', e.target.value)}
              />

              <InputFeild
                label="Branch (Without GST)"
                placeholder="E.g., Tambaram West, Chennai"
                value={settingsData.bankBranchWithoutGst || ''}
                onChange={(e) => handleChange('bankBranchWithoutGst', e.target.value)}
              />

              <InputFeild
                label="IFSC Code (Without GST)"
                placeholder="E.g., IDIB000T092"
                value={settingsData.bankIfscWithoutGst || ''}
                onChange={(e) => handleChange('bankIfscWithoutGst', e.target.value)}
              />

              <InputFeild
                label="GPay Number (Without GST)"
                placeholder="E.g., 9677876445"
                value={settingsData.gpayNumberWithoutGst || ''}
                onChange={(e) => handleChange('gpayNumberWithoutGst', e.target.value)}
              />
            </div>
          </div>

          {/* Section 5: Authorized Signatory Image */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-gray-900 font-bold text-base">
              <FileSignature className="w-5 h-5 text-blue-600" />
              <h3>Authorized Signatory Image</h3>
            </div>

            <div className="border-2 border-dashed rounded-xl p-6 text-center border-gray-300 hover:border-blue-500/60 bg-gray-50/60 transition-colors relative">
              {settingsData.signatureImage ? (
                <div className="relative inline-block">
                  <img
                    src={getSignatureSrc(settingsData.signatureImage)}
                    alt="Signature"
                    className="max-h-[120px] object-contain bg-white rounded-lg p-3 border border-gray-200 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setSettingsData((prev) => ({ ...prev, signatureImage: '' }))}
                    className="absolute -top-2.5 -right-2.5 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 shadow-sm transition-colors cursor-pointer"
                    title="Remove signature"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label htmlFor="signature-upload" className="cursor-pointer block py-4 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                      Click to upload
                    </span>
                    <span className="text-sm text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-400">PNG, JPG or JPEG image of official signature</p>
                </label>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="signature-upload"
                onChange={handleSignatureUpload}
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
              disabled={isUpdatingSettings || !hasChanges}
              className="w-full sm:w-auto"
            >
              Save GST Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GstSettings;
