import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ListFilter, ArrowDownAZ, ArrowUpAZ, Search, Check, X } from 'lucide-react';

export default function ColumnFilterHeader({
  columnKey,
  title,
  icon,
  sortConfig,
  setSortConfig,
  filters,
  updateFilter,
  clearFilter,
  uniqueValues,
  disableSort
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState(new Set());
  const [localExclude, setLocalExclude] = useState(false);
  const dropdownRef = useRef(null);

  const isActive = filters[columnKey] !== undefined;
  const isSortedAsc = sortConfig?.key === columnKey && sortConfig?.direction === 'asc';
  const isSortedDesc = sortConfig?.key === columnKey && sortConfig?.direction === 'desc';

  // Initialize local state when opening
  useEffect(() => {
    if (isOpen) {
      if (filters[columnKey]) {
        setLocalSelected(new Set(filters[columnKey].selected));
        setLocalExclude(filters[columnKey].exclude);
      } else {
        // By default, if no filter, everything is "selected" to be included
        setLocalSelected(new Set(uniqueValues));
        setLocalExclude(false);
      }
      setSearchTerm('');
    }
  }, [isOpen, filters, columnKey, uniqueValues]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const visibleValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter(val => val.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [uniqueValues, searchTerm]);

  const handleSortAsc = () => {
    setSortConfig({ key: columnKey, direction: 'asc' });
    setIsOpen(false);
  };

  const handleSortDesc = () => {
    setSortConfig({ key: columnKey, direction: 'desc' });
    setIsOpen(false);
  };

  const toggleSelection = (val) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (next.has(val)) {
        next.delete(val);
      } else {
        next.add(val);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (localSelected.size === uniqueValues.length) {
      setLocalSelected(new Set());
    } else {
      setLocalSelected(new Set(uniqueValues));
    }
  };

  const handleApply = () => {
    // If everything is selected and exclude is false, we can just clear the filter
    if (localSelected.size === uniqueValues.length && !localExclude) {
      clearFilter(columnKey);
    } else if (localSelected.size === 0 && localExclude) {
      // Exclude nothing = include everything
      clearFilter(columnKey);
    } else {
      updateFilter(columnKey, Array.from(localSelected), localExclude);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    clearFilter(columnKey);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center gap-2" ref={dropdownRef}>
      <div className="flex items-center gap-2 select-none">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="text-slate-400 uppercase text-xs font-bold tracking-wider">{title}</span>
      </div>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded transition-colors ${
          isActive || isSortedAsc || isSortedDesc 
            ? 'text-blue-400 bg-blue-900/30 hover:bg-blue-900/50' 
            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
        }`}
      >
        <ListFilter className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[100] text-sm overflow-hidden flex flex-col font-sans normal-case tracking-normal">
          {/* Sorting Actions */}
          {!disableSort && (
            <div className="p-2 border-b border-slate-800 flex flex-col gap-1">
              <button
                onClick={handleSortAsc}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${isSortedAsc ? 'bg-blue-900/40 text-blue-400' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <ArrowDownAZ className="w-4 h-4" /> Sort A to Z
              </button>
              <button
                onClick={handleSortDesc}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${isSortedDesc ? 'bg-blue-900/40 text-blue-400' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <ArrowUpAZ className="w-4 h-4" /> Sort Z to A
              </button>
            </div>
          )}

          {/* Filter Search */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search values..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <label className="flex items-center gap-2 mt-3 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={localExclude}
                onChange={(e) => setLocalExclude(e.target.checked)}
                className="w-3.5 h-3.5 accent-red-500"
              />
              <span className={localExclude ? 'text-red-400 font-bold' : ''}>Filter OUT (Exclude Selected)</span>
            </label>
          </div>

          {/* Checkboxes List */}
          <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer text-slate-200 text-sm font-semibold border-b border-slate-800/50 mb-1">
              <input
                type="checkbox"
                checked={localSelected.size === uniqueValues.length && uniqueValues.length > 0}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              (Select All)
            </label>
            
            {visibleValues.length === 0 ? (
              <div className="text-slate-500 text-xs italic px-2 py-2 text-center">No matches found</div>
            ) : (
              visibleValues.map(val => (
                <label key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer text-slate-300 text-sm">
                  <input
                    type="checkbox"
                    checked={localSelected.has(val)}
                    onChange={() => toggleSelection(val)}
                    className="w-3.5 h-3.5 accent-blue-500"
                  />
                  <span className="truncate" title={val || '(Blanks)'}>{val || '(Blanks)'}</span>
                </label>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900/50">
            <button
              onClick={handleClear}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-[2] px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-1 shadow-lg shadow-blue-900/20"
            >
              <Check className="w-3.5 h-3.5" /> Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
