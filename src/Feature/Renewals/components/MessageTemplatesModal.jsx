import React, { useState, useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';
import { useSaveTemplateMutation } from '../../../Redux/Template';

export const MessageTemplatesModal = ({
  isOpen,
  onClose,
  templates = {},
  onTemplatesUpdated,
}) => {
  const [saveTemplateMutation, { isLoading: isSaving }] = useSaveTemplateMutation();
  const [activeTab, setActiveTab] = useState('Renewal');
  const [tempSubject, setTempSubject] = useState('');
  const [tempContent, setTempContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('Renewal');
      setTempSubject(templates?.Renewal?.subject || '');
      setTempContent(templates?.Renewal?.content || '');
    }
  }, [isOpen, templates]);

  if (!isOpen) return null;

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setTempSubject(templates?.[tab]?.subject || '');
    setTempContent(templates?.[tab]?.content || '');
  };

  const handleSave = async () => {
    try {
      await saveTemplateMutation({
        name: activeTab,
        subject: tempSubject,
        content: tempContent,
      }).unwrap();
      toast.success(`${activeTab} template saved!`);
      if (onTemplatesUpdated) {
        onTemplatesUpdated({
          ...templates,
          [activeTab]: { subject: tempSubject, content: tempContent },
        });
      }
      onClose();
    } catch (err) {
      toast.error('Failed to save template');
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-[620px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#0052cc]" />
            <h3 className="text-base font-bold text-gray-900">Message Templates</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-500 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-gray-100">
          {['Renewal', 'Expired', 'Deletion', 'Payment'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleSelectTab(tab)}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === tab
                  ? 'border-[#0052cc] text-[#0052cc]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
              Subject
            </label>
            <input
              type="text"
              value={tempSubject}
              onChange={(e) => setTempSubject(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
              placeholder="Enter email subject..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
              Template Content
            </label>
            <textarea
              rows={8}
              value={tempContent}
              onChange={(e) => setTempContent(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-800 font-mono leading-relaxed outline-none focus:border-blue-500 focus:bg-white transition-all"
              placeholder="Enter template body (supports [Customer Name], [Service Name], etc.)..."
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <Button
            onClick={handleSave}
            loading={isSaving}
            className="rounded-xl px-5 py-2 font-semibold text-xs"
          >
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageTemplatesModal;

