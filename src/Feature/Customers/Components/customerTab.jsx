import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import InputFeild from '../../../UI/Components/InputFeild';
import Button from '../../../UI/Components/Button';

const WORLD_COUNTRIES = [
  "Canada", "India", "United States", "United Kingdom", "United Arab Emirates", "Australia",
  "Singapore", "Germany", "France", "Japan", "Saudi Arabia", "Malaysia", "Qatar", "Oman",
  "Kuwait", "Bahrain", "New Zealand", "China", "Hong Kong", "South Africa", "Italy", "Spain",
  "Netherlands", "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Belgium",
  "Austria", "Brazil", "Mexico", "Argentina", "Chile", "Colombia", "Peru", "Egypt", "Nigeria",
  "Kenya", "Ghana", "Thailand", "Vietnam", "Indonesia", "Philippines", "South Korea", "Taiwan",
  "Sri Lanka", "Bangladesh", "Nepal", "Pakistan", "Maldives", "Mauritius", "Russia", "Turkey",
  "Israel", "Jordan", "Lebanon", "Cyprus", "Greece", "Portugal", "Poland", "Czech Republic",
  "Hungary", "Romania", "Ukraine", "Albania", "Afghanistan"
];

const reorderArray = (arr, selectedIdx) => {
  if (selectedIdx === 0 || !arr[selectedIdx]) return arr;
  const item = arr[selectedIdx];
  const rest = arr.filter((_, idx) => idx !== selectedIdx);
  return [item, ...rest];
};

export const CustomerTab = ({ customer, onUpdate, isUpdating = false }) => {
  const [formData, setFormData] = useState({
    email: '',
    contactPerson: '',
    country: 'India',
    phone: '',
    state: 'Tamil Nadu',
    gstin: '',
    notes: '',
  });

  const [companyNames, setCompanyNames] = useState(['']);
  const [defaultNameIndex, setDefaultNameIndex] = useState(0);

  const [addresses, setAddresses] = useState(['']);
  const [defaultAddressIndex, setDefaultAddressIndex] = useState(0);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      const names = (customer.name || '').split(';').map((n) => n.trim()).filter(Boolean);
      const addrs = (customer.address || '').split(';').map((a) => a.trim()).filter(Boolean);

      setCompanyNames(names.length > 0 ? names : ['']);
      setAddresses(addrs.length > 0 ? addrs : ['']);
      setDefaultNameIndex(0);
      setDefaultAddressIndex(0);

      setFormData({
        email: Array.isArray(customer.email) ? customer.email.join(', ') : (customer.email || ''),
        contactPerson: customer.contactPerson || '',
        country: customer.country || 'India',
        phone: Array.isArray(customer.phone) ? customer.phone.join(', ') : (customer.phone || ''),
        state: customer.state || 'Tamil Nadu',
        gstin: customer.gstin || '',
        notes: customer.notes || '',
      });
    } else {
      setCompanyNames(['']);
      setAddresses(['']);
      setDefaultNameIndex(0);
      setDefaultAddressIndex(0);
      setFormData({
        email: '',
        contactPerson: '',
        country: 'India',
        phone: '',
        state: 'Tamil Nadu',
        gstin: '',
        notes: '',
      });
    }
  }, [customer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleNameChange = (index, value) => {
    const updated = [...companyNames];
    updated[index] = value;
    setCompanyNames(updated);
    if (errors.companyName) {
      setErrors((prev) => ({ ...prev, companyName: '' }));
    }
  };

  const handleAddName = () => {
    setCompanyNames([...companyNames, '']);
  };

  const handleRemoveName = (index) => {
    if (companyNames.length <= 1) return;
    const updated = companyNames.filter((_, i) => i !== index);
    setCompanyNames(updated);
    if (defaultNameIndex >= updated.length) {
      setDefaultNameIndex(0);
    }
  };

  const handleAddressChange = (index, value) => {
    const updated = [...addresses];
    updated[index] = value;
    setAddresses(updated);
    if (errors.address) {
      setErrors((prev) => ({ ...prev, address: '' }));
    }
  };

  const handleAddAddress = () => {
    setAddresses([...addresses, '']);
  };

  const handleRemoveAddress = (index) => {
    if (addresses.length <= 1) return;
    const updated = addresses.filter((_, i) => i !== index);
    setAddresses(updated);
    if (defaultAddressIndex >= updated.length) {
      setDefaultAddressIndex(0);
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) errs.email = 'Email address is required';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    const hasValidName = companyNames.some((n) => n.trim().length > 0);
    if (!hasValidName) errs.companyName = 'At least one company name is required';
    const hasValidAddress = addresses.some((a) => a.trim().length > 0);
    if (!hasValidAddress) errs.address = 'At least one address is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const orderedNames = reorderArray(companyNames, defaultNameIndex);
    const orderedAddresses = reorderArray(addresses, defaultAddressIndex);
    const joinedNames = orderedNames.map((n) => n.trim()).filter(Boolean).join('; ');
    const joinedAddresses = orderedAddresses.map((a) => a.trim()).filter(Boolean).join('; ');

    const payload = {
      ...formData,
      name: joinedNames,
      address: joinedAddresses,
    };

    if (onUpdate) {
      await onUpdate(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-[#c3c6d6]/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
          <span className="material-symbols-outlined text-[#003d9b] text-[20px]">person</span>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Customer Information</h2>
        </div>

        {/* Form Fields Grid */}
        <div className="space-y-5">
          {/* Email (Full Width) */}
          <InputFeild
            label="EMAIL ADDRESS"
            required
            hint="(Separate multiple with commas)"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="e.g. info@domain.com, contact@domain.com"
            error={errors.email}
          />

          {/* Row: Company Name & Contact Person */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Company Name with multi-entry & radio selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-gray-700 tracking-wider uppercase select-none">
                COMPANY NAME <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="space-y-2">
                {companyNames.map((nameVal, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="defaultCompanyNameRadio"
                      checked={defaultNameIndex === idx}
                      onChange={() => setDefaultNameIndex(idx)}
                      className="w-4 h-4 text-[#003d9b] accent-[#003d9b] focus:ring-[#003d9b] cursor-pointer shrink-0"
                      title="Set as Default Name"
                    />
                    <div className="flex-1">
                      <InputFeild
                        value={nameVal}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        placeholder="e.g. Information Technology Resource Inc."
                      />
                    </div>
                    {companyNames.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleRemoveName(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                        title="Remove Company Name"
                      />
                    )}
                  </div>
                ))}
              </div>
              {errors.companyName && (
                <p className="text-xs text-red-500 font-medium">{errors.companyName}</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={Plus}
                onClick={handleAddName}
                className="text-[#003d9b] bg-[#003d9b]/5 hover:bg-[#003d9b]/10 mt-1 font-bold"
              >
                Add Company Name
              </Button>
            </div>

            {/* Contact Person */}
            <InputFeild
              label="CONTACT PERSON"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleInputChange}
              placeholder="e.g. Rupinder S. Ubbi"
            />
          </div>

          {/* Row: Country & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <InputFeild
              as="select"
              label="COUNTRY"
              required
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              options={WORLD_COUNTRIES}
            />

            <InputFeild
              label="PHONE NUMBER"
              required
              hint="(Separate multiple with commas)"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="e.g. 004166337072, 9876543210"
              error={errors.phone}
            />
          </div>

          {/* Row: State & GSTIN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <InputFeild
              as="select"
              label="STATE"
              required
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              options={['Other State', 'Tamil Nadu']}
            />

            <InputFeild
              label="GSTIN"
              name="gstin"
              value={formData.gstin}
              onChange={handleInputChange}
              placeholder="Customer GSTIN (Optional)"
            />
          </div>

          {/* Row: Address & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Address with multi-entry & radio selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-gray-700 tracking-wider uppercase select-none">
                ADDRESS <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="space-y-2">
                {addresses.map((addrVal, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="defaultAddressRadio"
                      checked={defaultAddressIndex === idx}
                      onChange={() => setDefaultAddressIndex(idx)}
                      className="w-4 h-4 text-[#003d9b] accent-[#003d9b] focus:ring-[#003d9b] cursor-pointer shrink-0 mt-3"
                      title="Set as Default Address"
                    />
                    <div className="flex-1">
                      <InputFeild
                        as="textarea"
                        rows={2}
                        value={addrVal}
                        onChange={(e) => handleAddressChange(idx, e.target.value)}
                        placeholder="Customer Address..."
                      />
                    </div>
                    {addresses.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleRemoveAddress(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 mt-2"
                        title="Remove Address"
                      />
                    )}
                  </div>
                ))}
              </div>
              {errors.address && (
                <p className="text-xs text-red-500 font-medium">{errors.address}</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={Plus}
                onClick={handleAddAddress}
                className="text-[#003d9b] bg-[#003d9b]/5 hover:bg-[#003d9b]/10 mt-1 font-bold"
              >
                Add Address
              </Button>
            </div>

            {/* Notes */}
            <InputFeild
              as="textarea"
              rows={3}
              label="NOTES"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Customer Notes"
            />
          </div>
        </div>
      </div>

      {/* Action Button: Update Profile / Create Customer (Bottom Right) */}
      <div className="flex justify-end">
        <Button
          type="submit"
          loading={isUpdating}
          className="px-6 py-2.5 font-bold rounded-xl"
        >
          {customer?._id ? 'Update Profile' : 'Save Customer'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerTab;

