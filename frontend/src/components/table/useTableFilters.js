import { useState, useMemo } from 'react';

export function useTableFilters(data, columns) {
  // sortConfig: { key: string, direction: 'asc' | 'desc' } | null
  const [sortConfig, setSortConfig] = useState(null);
  
  // filters: { [key]: { selected: string[], exclude: boolean } }
  const [filters, setFilters] = useState({});

  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    const filterKeys = Object.keys(filters);
    if (filterKeys.length > 0) {
      result = result.filter(row => {
        return filterKeys.every(key => {
          const filter = filters[key];
          if (!filter || !filter.selected || filter.selected.length === 0) return true;
          
          const colDef = columns.find(c => c.key === key);
          if (!colDef) return true;

          const rowValue = colDef.valueGetter ? colDef.valueGetter(row) : row[key];
          // Trim strings just in case for cleaner matching
          const strValue = String(rowValue || '').trim();

          let matchesSelection = filter.selected.includes(strValue);
          if (filter.exclude) {
            matchesSelection = !matchesSelection;
          }

          return matchesSelection;
        });
      });
    }

    // Apply sort
    if (sortConfig) {
      const colDef = columns.find(c => c.key === sortConfig.key);
      if (colDef) {
        result.sort((a, b) => {
          const rawA = colDef.valueGetter ? colDef.valueGetter(a) : a[sortConfig.key];
          const rawB = colDef.valueGetter ? colDef.valueGetter(b) : b[sortConfig.key];
          
          // Handle numeric sort if possible, otherwise string sort
          const numA = parseFloat(rawA);
          const numB = parseFloat(rawB);
          
          if (!isNaN(numA) && !isNaN(numB) && String(numA) === String(rawA) && String(numB) === String(rawB)) {
             // Both are clean numbers
             return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }

          const strA = String(rawA || '').toLowerCase().trim();
          const strB = String(rawB || '').toLowerCase().trim();

          if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, columns, sortConfig, filters]);

  const getUniqueValues = (key) => {
    const colDef = columns.find(c => c.key === key);
    if (!colDef) return [];
    
    const values = new Set();
    data.forEach(row => {
      const val = colDef.valueGetter ? colDef.valueGetter(row) : row[key];
      values.add(String(val || '').trim());
    });
    return Array.from(values).sort();
  };

  const updateFilter = (key, selected, exclude) => {
    setFilters(prev => ({
      ...prev,
      [key]: { selected, exclude }
    }));
  };

  const clearFilter = (key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  return {
    processedData,
    sortConfig,
    setSortConfig,
    filters,
    updateFilter,
    clearFilter,
    getUniqueValues
  };
}
