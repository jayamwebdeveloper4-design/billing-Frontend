import React, { useState, useEffect } from 'react'
import { getGstSettings, updateGstSettings, uploadSignatureImage } from '../api/gstSettingsApi'
import toast from 'react-hot-toast'

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
  gpayNumberWithoutGst: '9677876445'
};

const GstSettings = () => {
  const [settingsData, setSettingsData] = useState(defaultSettings)
  const [originalSettings, setOriginalSettings] = useState(defaultSettings)
  
  const [loading, setLoading] = useState(true)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const data = await getGstSettings()
      if (data) {
        const mergedData = { ...defaultSettings, ...data };
        setSettingsData(mergedData)
        setOriginalSettings(mergedData)
      }
    } catch (error) {
      console.error('Error fetching GST settings:', error)
      toast.error('Failed to load GST settings')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSettings = async (e) => {
    e.preventDefault()
    setIsUpdatingSettings(true)
    try {
      await updateGstSettings(settingsData)
      setOriginalSettings(settingsData)
      toast.success('GST Settings updated successfully!')
    } catch (error) {
      toast.error('Failed to update GST settings')
    } finally {
      setIsUpdatingSettings(false)
    }
  }

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
        const response = await uploadSignatureImage(formData);
        if (response && response.filePath) {
          setSettingsData(prev => ({ ...prev, signatureImage: response.filePath }));
          toast.success('Signature uploaded successfully!', { id: toastId });
        } else {
          toast.error('Failed to get path for uploaded signature.', { id: toastId });
        }
      } catch (error) {
        console.error('Error uploading signature image:', error);
        toast.error('Failed to upload signature image.', { id: toastId });
      }
    }
  }

  if (loading) {
    return <div className="p-xl text-center">Loading settings...</div>
  }

  const hasChanges = JSON.stringify(settingsData) !== JSON.stringify(originalSettings);

  return (
    <div className="max-w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl md:text-h1 font-bold text-on-surface mb-lg md:mb-xl">GST & Company Settings</h1>
      
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md md:p-xl shadow-sm">
        <div className="flex items-center justify-between mb-lg md:mb-xl">
          <div className="flex items-center gap-sm text-primary">
            <span className="material-symbols-outlined text-[24px] md:text-[28px]">receipt_long</span>
            <h3 className="text-lg md:text-h3 font-bold text-on-surface truncate">Tax & Invoice Configuration</h3>
          </div>
        </div>

        <form onSubmit={handleUpdateSettings} className="space-y-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Company Name (GST Invoice)</label>
              <input 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                type="text" 
                value={settingsData.companyName || ''}
                onChange={(e) => setSettingsData({ ...settingsData, companyName: e.target.value })}
                placeholder="E.g., JAYAM TECHNOLOGIES"
                required
              />
            </div>

            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Company Name (Without GST Invoice)</label>
              <input 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                type="text" 
                value={settingsData.companyNameWithoutGst || ''}
                onChange={(e) => setSettingsData({ ...settingsData, companyNameWithoutGst: e.target.value })}
                placeholder="E.g., JAYAM SOLUTIONS"
              />
            </div>
            
            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">GSTIN</label>
              <input 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                type="text" 
                value={settingsData.gstin || ''}
                onChange={(e) => setSettingsData({ ...settingsData, gstin: e.target.value })}
                placeholder="E.g., 33AOXPL..."
              />
            </div>

            <div className="space-y-sm">
              {/* Spacer/Empty column to keep alignment neat */}
            </div>

            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Phone Number (GST Invoice)</label>
              <input 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                type="text" 
                value={settingsData.phone || ''}
                onChange={(e) => setSettingsData({ ...settingsData, phone: e.target.value })}
                placeholder="E.g., +91 9677876445"
                required
              />
            </div>

            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Phone Number (Without GST Invoice)</label>
              <input 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                type="text" 
                value={settingsData.phoneWithoutGst || ''}
                onChange={(e) => setSettingsData({ ...settingsData, phoneWithoutGst: e.target.value })}
                placeholder="E.g., +91 9677876445"
              />
            </div>

            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Email Address (GST Invoice)</label>
              <input 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                type="email" 
                value={settingsData.email || ''}
                onChange={(e) => setSettingsData({ ...settingsData, email: e.target.value })}
                placeholder="E.g., info@jayam.co.in"
                required
              />
            </div>

            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Email Address (Without GST Invoice)</label>
              <input 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                type="email" 
                value={settingsData.emailWithoutGst || ''}
                onChange={(e) => setSettingsData({ ...settingsData, emailWithoutGst: e.target.value })}
                placeholder="E.g., info@jayam.co.in"
              />
            </div>
            
            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Complete Address (GST Invoice)</label>
              <textarea 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all min-h-[100px] resize-y bg-surface-container-low border-outline-variant"
                value={settingsData.address || ''}
                onChange={(e) => setSettingsData({ ...settingsData, address: e.target.value })}
                placeholder="E.g., No. 1, First Floor..."
                required
              />
            </div>

            <div className="space-y-sm">
              <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Complete Address (Without GST Invoice)</label>
              <textarea 
                className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all min-h-[100px] resize-y bg-surface-container-low border-outline-variant"
                value={settingsData.addressWithoutGst || ''}
                onChange={(e) => setSettingsData({ ...settingsData, addressWithoutGst: e.target.value })}
                placeholder="E.g., No. 1, First Floor..."
              />
            </div>
          </div>

          <div className="pt-md border-t border-outline-variant/30">
            <h4 className="text-body-md font-bold mb-md">Tax Configuration</h4>
            <div className="grid grid-cols-3 gap-md">
              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">CGST %</label>
                <div className="relative">
                  <span className="absolute right-sm top-1/2 -translate-y-1/2 font-body-sm text-on-surface-variant">%</span>
                  <input 
                    className="w-full border rounded-xl pl-md pr-8 py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                    type="number" 
                    value={settingsData.cgstPercentage}
                    onChange={(e) => setSettingsData({ ...settingsData, cgstPercentage: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">SGST %</label>
                <div className="relative">
                  <span className="absolute right-sm top-1/2 -translate-y-1/2 font-body-sm text-on-surface-variant">%</span>
                  <input 
                    className="w-full border rounded-xl pl-md pr-8 py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                    type="number" 
                    value={settingsData.sgstPercentage}
                    onChange={(e) => setSettingsData({ ...settingsData, sgstPercentage: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">IGST %</label>
                <div className="relative">
                  <span className="absolute right-sm top-1/2 -translate-y-1/2 font-body-sm text-on-surface-variant">%</span>
                  <input 
                    className="w-full border rounded-xl pl-md pr-8 py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                    type="number" 
                    value={settingsData.igstPercentage}
                    onChange={(e) => setSettingsData({ ...settingsData, igstPercentage: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-md border-t border-outline-variant/30">
            <h4 className="text-body-md font-bold mb-md text-primary flex items-center gap-sm">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
              Bank Details (With GST Invoice)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Account Name (With GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankAccountName || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankAccountName: e.target.value })}
                  placeholder="E.g., JAYAM TECHNOLOGIES"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Account Number (With GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankAccountNumber || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankAccountNumber: e.target.value })}
                  placeholder="E.g., 120035000004"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Bank Name (With GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankName || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankName: e.target.value })}
                  placeholder="E.g., Canara Bank"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Branch (With GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankBranch || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankBranch: e.target.value })}
                  placeholder="E.g., Perungalathur"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">IFSC Code (With GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankIfsc || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankIfsc: e.target.value })}
                  placeholder="E.g., CNRB0003856"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">GPay Number (With GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.gpayNumber || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, gpayNumber: e.target.value })}
                  placeholder="E.g., 9840599789"
                />
              </div>
            </div>
          </div>

          <div className="pt-md border-t border-outline-variant/30">
            <h4 className="text-body-md font-bold mb-md text-primary flex items-center gap-sm">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              Bank Details (Without GST Invoice)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Account Name (Without GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankAccountNameWithoutGst || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankAccountNameWithoutGst: e.target.value })}
                  placeholder="E.g., Jayam Web Solutions"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Account Number (Without GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankAccountNumberWithoutGst || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankAccountNumberWithoutGst: e.target.value })}
                  placeholder="E.g., 722473240"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Bank Name (Without GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankNameWithoutGst || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankNameWithoutGst: e.target.value })}
                  placeholder="E.g., Indian Bank"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Branch (Without GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankBranchWithoutGst || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankBranchWithoutGst: e.target.value })}
                  placeholder="E.g., Tambaram West, Chennai"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">IFSC Code (Without GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.bankIfscWithoutGst || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, bankIfscWithoutGst: e.target.value })}
                  placeholder="E.g., IDIB000T092"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">GPay Number (Without GST)</label>
                <input 
                  className="w-full border rounded-xl px-md py-3 font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-surface-container-low border-outline-variant"
                  type="text" 
                  value={settingsData.gpayNumberWithoutGst || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, gpayNumberWithoutGst: e.target.value })}
                  placeholder="E.g., 9677876445"
                />
              </div>
            </div>
          </div>

          <div className="space-y-sm pt-md border-t border-outline-variant/30">
            <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Authorized Signatory Image</label>
            <div className="relative border-2 border-dashed rounded-xl p-md text-center transition-colors border-outline-variant hover:border-primary/50 bg-surface-container-low cursor-pointer">
              {settingsData.signatureImage ? (
                <div className="relative inline-block">
                  <img src={getSignatureSrc(settingsData.signatureImage)} alt="Signature" className="max-h-[100px] object-contain bg-white rounded-lg p-2 border border-outline-variant" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSettingsData({ ...settingsData, signatureImage: '' });
                    }}
                    className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-error/90 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ) : (
                <div className="py-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] opacity-50 mb-sm block">draw</span>
                  <p className="text-xs">Upload Signature Image</p>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                className="hidden"
                id="signature-upload"
                onChange={handleSignatureUpload}
              />
              {!settingsData.signatureImage && (
                <label htmlFor="signature-upload" className="absolute inset-0 cursor-pointer"></label>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isUpdatingSettings || !hasChanges}
            className="w-full bg-primary text-on-primary py-3 md:py-md rounded-xl font-bold transition-all hover:brightness-110 active:scale-[0.98] shadow-md flex items-center justify-center gap-sm mt-xl cursor-pointer disabled:opacity-80 disabled:grayscale disabled:cursor-not-allowed text-sm md:text-body-md"
          >
            {isUpdatingSettings ? (
              <div className="flex items-center gap-sm">
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Save Settings
              </>
            )}
          </button>
          
        </form>
      </div>
    </div>
  )
}

export default GstSettings
