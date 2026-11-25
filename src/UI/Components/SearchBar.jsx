import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Search customers name or email or domain...',
  debounceTime = 300,
  className = '',
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(controlledValue || '');

  // Keep internal state in sync if parent updates controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Debounced search trigger for performance optimization
  useEffect(() => {
    const handler = setTimeout(() => {
      if (onSearch) {
        onSearch(internalValue);
      } else if (onChange) {
        onChange(internalValue);
      }
    }, debounceTime);

    return () => clearTimeout(handler);
  }, [internalValue, debounceTime, onSearch, onChange]);

  const handleChange = (e) => {
    setInternalValue(e.target.value);
  };

  const handleClear = () => {
    setInternalValue('');
    if (onSearch) onSearch('');
    if (onChange) onChange('');
  };

  return (
    <div className={`relative flex-1 min-w-[260px] max-w-[480px] w-full ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full min-w-0 pl-10 pr-9 py-2.5 bg-white text-sm text-gray-800 placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-xs"
        {...props}
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;

