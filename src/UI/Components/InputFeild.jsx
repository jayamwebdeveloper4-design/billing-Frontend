import React from 'react';

export const InputFeild = ({
  label,
  required = false,
  hint,
  error,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  as = 'input', // 'input' | 'textarea' | 'select'
  options = [],
  disabled = false,
  className = '',
  inputClassName = '',
  rows = 3,
  children,
  leftElement,
  rightElement,
  ...props
}) => {
  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {label && (
        <label className="block text-[11px] font-normal text-gray-700 tracking-wider uppercase select-none">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {hint && (
            <span className="text-[10px] text-blue-600 font-normal lowercase normal-case ml-1 italic font-sans">
              {hint}
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftElement && <div className="shrink-0 mr-2">{leftElement}</div>}

        {as === 'textarea' ? (
          <textarea
            name={name}
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={`w-full bg-[#f8f9fb] border border-[#c3c6d6] rounded-lg px-3.5 py-2.5 text-sm text-[#191c1e] placeholder:text-gray-400 focus:bg-white focus:border-[#003d9b] focus:ring-2 focus:ring-[#003d9b]/15 outline-none transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed ${
              error ? 'border-red-500' : ''
            } ${inputClassName}`}
            {...props}
          />
        ) : as === 'select' ? (
          <select
            name={name}
            value={value ?? ''}
            onChange={onChange}
            disabled={disabled}
            className={`w-full bg-[#f8f9fb] border border-[#c3c6d6] rounded-lg px-3.5 py-2.5 text-sm text-[#191c1e] focus:bg-white focus:border-[#003d9b] focus:ring-2 focus:ring-[#003d9b]/15 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
              error ? 'border-red-500' : ''
            } ${inputClassName}`}
            {...props}
          >
            {options.map((opt) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const lbl = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
            {children}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full bg-[#f8f9fb] border border-[#c3c6d6] rounded-lg px-3.5 py-2.5 text-sm text-[#191c1e] placeholder:text-gray-400 focus:bg-white focus:border-[#003d9b] focus:ring-2 focus:ring-[#003d9b]/15 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              error ? 'border-red-500' : ''
            } ${inputClassName}`}
            {...props}
          />
        )}

        {rightElement && <div className="shrink-0 ml-2">{rightElement}</div>}
      </div>

      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
};

export default InputFeild;

