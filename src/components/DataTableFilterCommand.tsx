import { Kbd } from "@/components/custom/kbd";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { useHotKey } from "@/hooks/use-hot-key";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import { LoaderCircle, Search, X, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Table as TanStackTable } from "@tanstack/react-table";
import { useAppStore } from "@/lib/store";

interface DataTableFilterCommandProps {
  table: TanStackTable<any>;
}

type FilterField = {
  value: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
};

type MongoOperator = {
  operator: string;
  description: string;
  example: string;
  requiresValue: boolean;
};

const getMongoOperators = (fieldType: string): MongoOperator[] => {
  const baseOperators: MongoOperator[] = [
    { operator: '$eq', description: 'Equal to', example: 'value', requiresValue: true },
    { operator: '$ne', description: 'Not equal to', example: 'value', requiresValue: true },
    { operator: '$exists', description: 'Field exists', example: 'true', requiresValue: true },
    { operator: '$in', description: 'In array', example: '[val1,val2]', requiresValue: true },
    { operator: '$nin', description: 'Not in array', example: '[val1,val2]', requiresValue: true },
  ];

  switch (fieldType) {
    case 'text':
      return [
        { operator: '$eq', description: 'Exact match', example: 'value', requiresValue: true },
        { operator: '$ne', description: 'Not equal to', example: 'value', requiresValue: true },
        { operator: '$regex', description: 'Pattern matching', example: 'pattern', requiresValue: true },
        { operator: '$in', description: 'In array', example: '[val1,val2]', requiresValue: true },
        { operator: '$nin', description: 'Not in array', example: '[val1,val2]', requiresValue: true },
        { operator: '$exists', description: 'Field exists', example: 'true', requiresValue: true },
        { operator: '$text', description: 'Full text search', example: 'search terms', requiresValue: true },
        { operator: '$size', description: 'Array size', example: '5', requiresValue: true },
      ];
    
    case 'number':
      return [
        ...baseOperators,
        { operator: '$gt', description: 'Greater than', example: '100', requiresValue: true },
        { operator: '$gte', description: 'Greater than or equal', example: '100', requiresValue: true },
        { operator: '$lt', description: 'Less than', example: '100', requiresValue: true },
        { operator: '$lte', description: 'Less than or equal', example: '100', requiresValue: true },
        { operator: '$mod', description: 'Modulo', example: '[5,0]', requiresValue: true },
      ];
    
    case 'date':
      return [
        ...baseOperators,
        { operator: '$gt', description: 'After date', example: '2024-01-01', requiresValue: true },
        { operator: '$gte', description: 'On or after date', example: '2024-01-01', requiresValue: true },
        { operator: '$lt', description: 'Before date', example: '2024-01-01', requiresValue: true },
        { operator: '$lte', description: 'On or before date', example: '2024-01-01', requiresValue: true },
      ];
    
    case 'boolean':
      return [
        { operator: '$eq', description: 'Equal to', example: 'true', requiresValue: true },
        { operator: '$ne', description: 'Not equal to', example: 'false', requiresValue: true },
        { operator: '$exists', description: 'Field exists', example: 'true', requiresValue: true },
      ];
    
    default:
      return baseOperators;
  }
};

// Utility functions
function getWordByCaretPosition({ value, caretPosition }: { value: string; caretPosition: number }) {
  let start = caretPosition;
  let end = caretPosition;

  while (start > 0 && value[start - 1] !== ",") start--;
  while (end < value.length && value[end] !== ",") end++;

  return value.substring(start, end).trim();
}

function getFilterValue({ value, search, currentWord }: { value: string; search: string; currentWord: string }): number {
  if (value.startsWith("suggestion:")) {
    const rawValue = value.toLowerCase().replace("suggestion:", "");
    if (rawValue.includes(search)) return 1;
    return 0;
  }

  if (value.toLowerCase().includes(currentWord.toLowerCase())) return 1;

  const [filter, query] = currentWord.toLowerCase().split(":");
  if (query && value.startsWith(`${filter}:`)) {
    const rawValue = value.toLowerCase().replace(`${filter}:`, "");
    if (rawValue.includes(query)) return 1;
  }
  return 0;
}

function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDistanceToNow(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function DataTableFilterCommand({ table }: DataTableFilterCommandProps) {
  const { executeFilterQuery, clearQuery, isLoading, isQueryActive, queryFilter, tableData, totalCount } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [lastSearches, setLastSearches] = useLocalStorage<
    { search: string; timestamp: number }[]
  >("data-table-filter-command", []);

  // Get available filter fields from table columns + nested fields
  const filterFields: FilterField[] = useMemo(() => {
    const basicFields = table.getAllColumns()
      .filter(col => col.getCanFilter())
      .map(col => ({
        value: col.id,
        label: col.id,
        type: getColumnType(col.id, table.getCoreRowModel().rows[0]?.original)
      }));
    
    // Extract nested fields from sample data
    const nestedFields: FilterField[] = [];
    const sampleData = table.getCoreRowModel().rows[0]?.original;
    
    if (sampleData) {
      Object.entries(sampleData).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
          // This is a nested object, extract its keys
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            const fullPath = `${key}.${nestedKey}`;
            nestedFields.push({
              value: fullPath,
              label: fullPath,
              type: getNestedFieldType(nestedValue)
            });
          });
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          // This is an array of objects, extract keys from first object
          Object.entries(value[0]).forEach(([nestedKey, nestedValue]) => {
            const fullPath = `${key}.${nestedKey}`;
            nestedFields.push({
              value: fullPath,
              label: fullPath,
              type: getNestedFieldType(nestedValue)
            });
          });
        }
      });
    }
    
    return [...basicFields, ...nestedFields];
  }, [table, tableData]);

  function getColumnType(columnId: string, sampleData: any): 'text' | 'number' | 'date' | 'boolean' {
    if (!sampleData) return 'text';
    const value = sampleData[columnId];
    
    if (value === null || value === undefined) return 'text';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string' && !isNaN(Date.parse(value))) return 'date';
    return 'text';
  }

  function getNestedFieldType(value: any): 'text' | 'number' | 'date' | 'boolean' {
    if (value === null || value === undefined) return 'text';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string' && !isNaN(Date.parse(value))) return 'date';
    return 'text';
  }

  function parseFilterInput(input: string): Record<string, unknown> {
    const filters: Record<string, unknown> = {};
    const parts = input.trim().split(',').map(part => part.trim()).filter(part => part.includes(':'));
    
    parts.forEach(part => {
      // Split more carefully to handle operator syntax: field:$operator:value
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) return;
      
      const field = part.substring(0, colonIndex);
      const remainder = part.substring(colonIndex + 1);
      
      if (!field || !remainder) return;
      
      // Handle nested fields with dot notation (e.g., "footnotes.title")
      // For nested fields, we need to guess the type or default to text
      let fieldConfig = filterFields.find(f => f.value === field);
      if (!fieldConfig && field.includes('.')) {
        // Try to determine type from actual data
        let detectedType: 'text' | 'number' | 'date' | 'boolean' = 'text';
        const sampleData = table.getCoreRowModel().rows[0]?.original;
        if (sampleData) {
          const fieldPath = field.split('.');
          let current = sampleData;
          for (const part of fieldPath) {
            if (current && typeof current === 'object') {
              current = current[part];
            } else {
              break;
            }
          }
          if (current !== undefined) {
            detectedType = getNestedFieldType(current);
          }
        }
        
        // Create a virtual field config for nested fields
        fieldConfig = {
          value: field,
          label: field,
          type: detectedType
        };
      }
      
      if (!fieldConfig) return;
      
      // Check if remainder starts with MongoDB operator
      if (remainder.startsWith('$')) {
        // Handle MongoDB operator syntax: $operator:value
        const nextColonIndex = remainder.indexOf(':', 1);
        if (nextColonIndex === -1) return; // No value after operator
        
        const operator = remainder.substring(0, nextColonIndex); // e.g., '$eq'
        const operatorValue = remainder.substring(nextColonIndex + 1); // remaining value
        
        if (!operatorValue) return;
        
        let parsedValue: any = operatorValue;
        
        // Parse value based on field type and operator
        if (fieldConfig.type === 'number' && !['$in', '$nin', '$mod'].includes(operator)) {
          parsedValue = parseFloat(operatorValue);
          if (isNaN(parsedValue)) return;
        } else if (fieldConfig.type === 'boolean' && ['$eq', '$ne'].includes(operator)) {
          parsedValue = operatorValue.toLowerCase() === 'true';
        } else if (operator === '$in' || operator === '$nin') {
          // Handle arrays: [val1,val2,val3]
          if (operatorValue.startsWith('[') && operatorValue.endsWith(']')) {
            const arrayStr = operatorValue.slice(1, -1);
            parsedValue = arrayStr.split(',').map(v => {
              const trimmed = v.trim();
              // Try to parse as number if field is number type
              if (fieldConfig.type === 'number') {
                const num = parseFloat(trimmed);
                return isNaN(num) ? trimmed : num;
              }
              return trimmed;
            });
          } else {
            // If not array format, treat as single value array
            parsedValue = [operatorValue];
          }
        } else if (operator === '$exists') {
          parsedValue = operatorValue.toLowerCase() === 'true';
        } else if (operator === '$mod') {
          // Handle modulo: [divisor,remainder]
          if (operatorValue.startsWith('[') && operatorValue.endsWith(']')) {
            const arrayStr = operatorValue.slice(1, -1);
            parsedValue = arrayStr.split(',').map(v => parseInt(v.trim()));
          }
        } else if (operator === '$regex') {
          // Handle regex with options
          parsedValue = operatorValue;
        }
        
        filters[field] = { [operator]: parsedValue };
        
        // Add debug logging
        console.log(`Parsed operator query:`, { field, operator, operatorValue, parsedValue, result: filters[field] });
        
      } else {
        // Default behavior for simple values
        switch (fieldConfig.type) {
          case 'number':
            const numValue = parseFloat(remainder);
            if (!isNaN(numValue)) filters[field] = numValue;
            break;
          case 'boolean':
            filters[field] = remainder.toLowerCase() === 'true';
            break;
          case 'date':
            filters[field] = { $regex: remainder, $options: 'i' };
            break;
          default:
            // For text fields, use exact match by default, regex only with wildcards
            if (remainder.includes('*') || remainder.includes('?')) {
              const regexValue = remainder.replace(/\*/g, '.*').replace(/\?/g, '.');
              filters[field] = { $regex: regexValue, $options: 'i' };
            } else {
              // Exact string match for text fields
              filters[field] = remainder;
            }
        }
      }
    });
    
    return filters;
  }

  function serializeFilters(filterObject: Record<string, unknown>): string {
    const parts: string[] = [];
    Object.entries(filterObject).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle MongoDB operator objects
        const operatorEntries = Object.entries(value as Record<string, unknown>);
        operatorEntries.forEach(([operator, operatorValue]) => {
          if (operator.startsWith('$')) {
            // Format: field:$operator:value
            if (Array.isArray(operatorValue)) {
              // Handle arrays: field:$in:[val1,val2,val3]
              parts.push(`${key}:${operator}:[${operatorValue.join(',')}]`);
            } else {
              // Handle simple values: field:$eq:100
              parts.push(`${key}:${operator}:${operatorValue}`);
            }
          }
        });
      } else {
        // Handle simple values: field:value
        parts.push(`${key}:${value}`);
      }
    });
    return parts.join(',');
  }

  // Function to execute the filter
  const handleFilterSubmit = () => {
    const filters = parseFilterInput(inputValue);
    executeFilterQuery(filters);
    setOpen(false);
  };

  // Don't auto-execute on every input change - wait for explicit submit
  // useEffect(() => {
  //   if (currentWord !== "" && open) return;
  //   if (currentWord !== "" && !open) setCurrentWord("");
  //   
  //   const filters = parseFilterInput(inputValue);
  //   
  //   // Execute the filter query through the store
  //   executeFilterQuery(filters);
  // }, [inputValue, open, currentWord, executeFilterQuery]);

  // Update input when query filter changes externally
  useEffect(() => {
    if (!open && queryFilter) {
      setInputValue(serializeFilters(queryFilter));
    }
  }, [queryFilter, open]);

  useHotKey(() => setOpen((prev) => !prev), "k");
  useHotKey(() => setOpen((prev) => prev ? false : prev), "Escape");

  useEffect(() => {
    if (open) {
      // Multiple attempts to ensure focus works
      const focusInput = () => {
        const input = inputRef?.current;
        if (input) {
          input.focus();
          input.select();
        } else {
          // Fallback: try to find the actual input element
          const commandInput = document.querySelector('[data-slot="command-input"]') as HTMLInputElement;
          if (commandInput) {
            commandInput.focus();
            commandInput.select();
          }
        }
      };
      
      // Try immediately
      focusInput();
      
      // Try after a small delay to ensure DOM is ready
      setTimeout(focusInput, 10);
      setTimeout(focusInput, 50);
    }
  }, [open]);

  function getFieldSuggestions(field: FilterField) {
    const column = table.getColumn(field.value);
    const uniqueValues = column?.getFacetedUniqueValues();
    
    if (uniqueValues) {
      return Array.from(uniqueValues.keys()).slice(0, 10);
    }
    
    // Fallback: get unique values from visible data
    const values = new Set();
    table.getCoreRowModel().rows.forEach(row => {
      const value = row.original[field.value];
      if (value !== null && value !== undefined) {
        values.add(value);
      }
    });
    
    return Array.from(values).slice(0, 10);
  }

  return (
    <div>
      <button
        type="button"
        className={cn(
          "cursor-pointer group flex w-full items-center rounded-md border border-input bg-background px-3 text-muted-foreground ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-accent/50 hover:text-accent-foreground",
          open ? "hidden" : "visible",
        )}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
          // Focus input after state update
          setTimeout(() => {
            const input = document.querySelector('[data-slot="command-input"]') as HTMLInputElement;
            if (input) {
              input.focus();
              input.click(); // Ensure caret appears
            }
          }, 0);
        }}
      >
        {isLoading ? (
          <LoaderCircle className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground opacity-50 group-hover:text-popover-foreground" />
        ) : (
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground opacity-50 group-hover:text-popover-foreground" />
        )}
        <span className="h-11 w-full max-w-sm truncate py-3 text-left text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 md:max-w-xl lg:max-w-4xl xl:max-w-5xl">
          {inputValue.trim() ? (
            <span className="text-foreground">{inputValue}</span>
          ) : (
            <span>Filter data table...</span>
          )}
        </span>
        <div className="flex ml-auto">
          {isQueryActive && inputValue.trim() && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                setInputValue('');
                await clearQuery();
              }}
              className="mr-2 p-1 rounded hover:bg-accent"
              title="Clear filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {isQueryActive && (
            <div className="mr-2 flex items-center">
              {totalCount === 0 ? (
                <div className="w-2 h-2 bg-orange-500 rounded-full" title="Filter active - no results found"></div>
              ) : (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Filter active"></div>
              )}
            </div>
          )}
          <Kbd className="ml-auto text-muted-foreground group-hover:text-accent-foreground">
            <span className="mr-1">⌘</span>
            <span>K</span>
          </Kbd>
        </div>
      </button>
      <Command
        className={cn(
          "overflow-visible rounded-md border border-border shadow-md dark:bg-muted/50 [&>div]:border-none",
          open ? "visible" : "hidden",
        )}
        filter={(value, search, keywords) =>
          getFilterValue({ value, search, keywords: keywords || [], currentWord })
        }
      >
        <div className="flex items-center">
          <div className="flex-1">
            <CommandInput
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  inputRef?.current?.blur();
                } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleFilterSubmit();
                }
              }}
              onBlur={() => {
                setOpen(false);
                const search = inputValue.trim();
                if (!search) return;
                const timestamp = Date.now();
                const searchIndex = lastSearches.findIndex(
                  (item) => item.search === search,
                );
                if (searchIndex !== -1) {
                  lastSearches[searchIndex].timestamp = timestamp;
                  setLastSearches(lastSearches);
                  return;
                }
                setLastSearches([...lastSearches, { search, timestamp }]);
              }}
              onInput={(e) => {
                const caretPosition = e.currentTarget?.selectionStart || -1;
                const value = e.currentTarget?.value || "";
                const word = getWordByCaretPosition({ value, caretPosition });
                setCurrentWord(word);
              }}
              placeholder="Filter data table..."
              className="text-foreground border-none w-full"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFilterSubmit();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="flex-shrink-0 p-2 hover:bg-accent rounded-md mr-2 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Execute filter (Cmd+Enter)"
            disabled={!inputValue.trim()}
          >
            <Play className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <div className="absolute top-2 z-50 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandList className="max-h-[310px]">
              <CommandGroup heading="Fields">
                {filterFields.filter(field => !field.value.includes('.')).map((field) => {
                  if (inputValue.includes(`${field.value}:`)) return null;
                  return (
                    <CommandItem
                      key={field.value}
                      value={field.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={(value) => {
                        setInputValue((prev) => {
                          if (currentWord.trim() === "") {
                            return `${prev}${value}:`;
                          }
                          const isStarting = currentWord === prev;
                          const prefix = isStarting ? "" : ",";
                          const input = prev.replace(
                            `${prefix}${currentWord}`,
                            `${prefix}${value}`,
                          );
                          return `${input}:`;
                        });
                        setCurrentWord(`${value}:`);
                      }}
                      className="group"
                    >
                      <span className="capitalize">{field.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {field.type}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Nested Fields">
                {filterFields.filter(field => field.value.includes('.')).map((field) => {
                  if (inputValue.includes(`${field.value}:`)) return null;
                  return (
                    <CommandItem
                      key={field.value}
                      value={field.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={(value) => {
                        setInputValue((prev) => {
                          if (currentWord.trim() === "") {
                            return `${prev}${value}:`;
                          }
                          const isStarting = currentWord === prev;
                          const prefix = isStarting ? "" : ",";
                          const input = prev.replace(
                            `${prefix}${currentWord}`,
                            `${prefix}${value}`,
                          );
                          return `${input}:`;
                        });
                        setCurrentWord(`${value}:`);
                      }}
                      className="group"
                    >
                      <span className="font-mono text-blue-600">{field.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {field.type}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Operators">
                {filterFields.map((field) => {
                  if (!currentWord.includes(`${field.value}:`)) return null;
                  
                  const operators = getMongoOperators(field.type);
                  
                  return operators.map((operator) => (
                    <CommandItem
                      key={`${field.value}:${operator.operator}`}
                      value={`${field.value}:${operator.operator}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        setInputValue((prev) => {
                          const input = prev.replace(currentWord, `${field.value}:${operator.operator}:`);
                          return input;
                        });
                        setCurrentWord(`${field.value}:${operator.operator}:`);
                      }}
                      className="group"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-mono text-blue-600">{operator.operator}</span>
                        <span className="text-xs text-muted-foreground">{operator.description}</span>
                      </div>
                      <span className="ml-auto text-xs font-mono text-muted-foreground">
                        {operator.example}
                      </span>
                    </CommandItem>
                  ));
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Values">
                {filterFields.map((field) => {
                  // Show values when typing field: or field:$operator:
                  const isFieldQuery = currentWord.includes(`${field.value}:`);
                  if (!isFieldQuery) return null;

                  // Check if we're in operator mode
                  const parts = currentWord.split(':');
                  const isOperatorMode = parts.length >= 3 && parts[1].startsWith('$');
                  
                  // Only show basic values if not in operator mode
                  if (isOperatorMode) return null;
                  
                  const suggestions = getFieldSuggestions(field);
                  const column = table.getColumn(field.value);
                  const facetedValue = column?.getFacetedUniqueValues();

                  return suggestions.map((optionValue) => (
                    <CommandItem
                      key={`${field.value}:${optionValue}`}
                      value={`${field.value}:${optionValue}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        setInputValue((prev) => {
                          const input = prev.replace(currentWord, `${field.value}:${optionValue}`);
                          return `${input.trim()},`;
                        });
                        setCurrentWord("");
                      }}
                    >
                      {String(optionValue)}
                      {facetedValue?.has(optionValue) && (
                        <span className="ml-auto font-mono text-muted-foreground">
                          {formatCompactNumber(facetedValue.get(optionValue) || 0)}
                        </span>
                      )}
                    </CommandItem>
                  ));
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Recent">
                {lastSearches
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 5)
                  .map((item) => (
                    <CommandItem
                      key={`suggestion:${item.search}`}
                      value={`suggestion:${item.search}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={(value) => {
                        const search = value.replace("suggestion:", "");
                        setInputValue(`${search},`);
                        setCurrentWord("");
                      }}
                      className="group"
                    >
                      {item.search}
                      <span className="ml-auto truncate text-muted-foreground/80 group-aria-[selected=true]:block">
                        {formatDistanceToNow(item.timestamp)}
                      </span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLastSearches(
                            lastSearches.filter(i => i.search !== item.search)
                          );
                        }}
                        className="ml-1 cursor-pointer hidden rounded-xs p-0.5 hover:bg-background group-aria-[selected=true]:block"
                      >
                        <X className="size-4" />
                      </button>
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandEmpty>No results found.</CommandEmpty>
            </CommandList>
            <div
              className="border-t bg-neutral-200/50 px-2 py-1.5 text-xs text-accent-foreground"
              cmdk-footer=""
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-3">
                  <span>
                    Use <Kbd variant="outline">↑</Kbd>{" "}
                    <Kbd variant="outline">↓</Kbd> to navigate
                  </span>
                  <span>
                    <Kbd variant="outline">Enter</Kbd> to select
                  </span>
                  <span>
                    <Kbd variant="outline">⌘ + Enter</Kbd> to execute
                  </span>
                  <span>
                    <Kbd variant="outline">Esc</Kbd> to close
                  </span>
                  {lastSearches.length > 0 && (
                    <>
                      <Separator orientation="vertical" className="my-auto h-3" />
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-accent-foreground"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => setLastSearches([])}
                      >
                        Clear history
                      </button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span>
                    Exact: <Kbd variant="outline" className="text-xs">name:john</Kbd>
                  </span>
                  <span>
                    Multiple: <Kbd variant="outline" className="text-xs">name:john,age:25</Kbd>
                  </span>
                  <span>
                    Pattern: <Kbd variant="outline" className="text-xs">name:*john*</Kbd>
                  </span>
                  <span>
                    Operator: <Kbd variant="outline" className="text-xs">age:$gte:25</Kbd>
                  </span>
                  <span>
                    Nested: <Kbd variant="outline" className="text-xs">footnotes.type:chapter_title</Kbd>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Command>
    </div>
  );
}