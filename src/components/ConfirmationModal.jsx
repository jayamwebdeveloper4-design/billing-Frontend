import React from 'react'

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', type = 'danger' }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/20 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[400px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">      
        <div className="p-lg space-y-md">
          <div className="flex items-center gap-md text-on-surface">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${type === 'danger' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
              <span className="material-symbols-outlined text-[28px]">
                {type === 'danger' ? 'warning' : 'info'}
              </span>
            </div>
            <div>
              <h3 className="font-h3 text-h3 text-[18px] leading-tight font-black tracking-tight">{title}</h3>
              <p className="text-on-surface-variant font-body-sm lowercase">{type === 'danger' ? 'Action Required' : 'Confirmation'}</p>
            </div>
          </div>

          <div className="py-sm">
            <p className="font-body-md text-on-surface-variant">
              {message}
            </p>
          </div>
        </div>

        <div className="bg-surface-container-low px-lg py-sm flex justify-end gap-sm border-t border-outline-variant/30">
          <button 
            onClick={onClose}
            className="px-lg py-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all text-[13px] cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`px-xl py-sm font-bold text-on-primary rounded-lg transition-all active:scale-[0.98] text-[13px] shadow-sm hover:shadow-md hover:brightness-110 cursor-pointer ${type === 'danger' ? 'bg-error' : 'bg-primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal
