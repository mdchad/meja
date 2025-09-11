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
import { LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Table as TanStackTable } from "@tanstack/react-table";

interface DataTableFilterCommandProps {
  table: TanStackTable<any>;
  isLoading?: boolean;
}

type FilterField = {
  value: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
};

// Utility functions
function getWordByCaretPosition({ value, caretPosition }: { value: string; caretPosition: number }) {
  let start = caretPosition;
  let end = caretPosition;

  while (start > 0 && value[start - 1] !== " ") start--;
  while (end < value.length && value[end] !== " ") end++;

  return value.substring(start, end);
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

export function DataTableFilterCommand({ table, isLoading = false }: DataTableFilterCommandProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [lastSearches, setLastSearches] = useLocalStorage<
    { search: string; timestamp: number }[]
  >("data-table-filter-command", []);

  // Get available filter fields from table columns
  const filterFields: FilterField[] = table.getAllColumns()
    .filter(col => col.getCanFilter())
    .map(col => ({
      value: col.id,
      label: col.id,
      type: getColumnType(col.id, table.getCoreRowModel().rows[0]?.original)
    }));

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

  function parseFilterInput(input: string) {
    const filters: { [key: string]: any } = {};
    const parts = input.trim().split(' ').filter(part => part.includes(':'));
    
    parts.forEach(part => {
      const [field, value] = part.split(':');
      if (field && value) {
        const fieldConfig = filterFields.find(f => f.value === field);
        if (fieldConfig) {
          switch (fieldConfig.type) {
            case 'number':
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) filters[field] = numValue;
              break;
            case 'boolean':
              filters[field] = value.toLowerCase() === 'true';
              break;
            default:
              filters[field] = value;
          }
        }
      }
    });
    
    return filters;
  }

  function serializeFilters(columnFilters: any[]): string {
    return columnFilters.map(filter => `${filter.id}:${filter.value}`).join(' ');
  }

  // Apply filters when input changes
  useEffect(() => {
    if (currentWord !== "" && open) return;
    if (currentWord !== "" && !open) setCurrentWord("");
    if (inputValue.trim() === "" && !open) return;

    const filters = parseFilterInput(inputValue);
    
    // Apply filters to table
    Object.keys(filters).forEach(key => {
      table.getColumn(key)?.setFilterValue(filters[key]);
    });
    
    // Reset columns not in filters
    table.getAllColumns().forEach(col => {
      if (col.getCanFilter() && !(col.id in filters)) {
        col.setFilterValue(undefined);
      }
    });
  }, [inputValue, open, currentWord, table]);

  // Update input when column filters change externally
  useEffect(() => {
    if (!open) {
      const columnFilters = table.getState().columnFilters;
      setInputValue(serializeFilters(columnFilters));
    }
  }, [table.getState().columnFilters, open]);

  useHotKey(() => setOpen((prev) => !prev), "k");

  useEffect(() => {
    if (open) {
      inputRef?.current?.focus();
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
          "group flex w-full items-center rounded-lg border border-input bg-background px-3 text-muted-foreground ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-accent/50 hover:text-accent-foreground",
          open ? "hidden" : "visible",
        )}
        onClick={() => setOpen(true)}
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
        <Kbd className="ml-auto text-muted-foreground group-hover:text-accent-foreground">
          <span className="mr-1">⌘</span>
          <span>K</span>
        </Kbd>
      </button>
      <Command
        className={cn(
          "overflow-visible rounded-lg border border-border shadow-md dark:bg-muted/50 [&>div]:border-none",
          open ? "visible" : "hidden",
        )}
        filter={(value, search, keywords) =>
          getFilterValue({ value, search, keywords: keywords || [], currentWord })
        }
      >
        <CommandInput
          ref={inputRef}
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={(e) => {
            if (e.key === "Escape") inputRef?.current?.blur();
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
          className="text-foreground"
        />
        <div className="relative">
          <div className="absolute top-2 z-10 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandList className="max-h-[310px]">
              <CommandGroup heading="Filter">
                {filterFields.map((field) => {
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
                          const prefix = isStarting ? "" : " ";
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
              <CommandGroup heading="Values">
                {filterFields.map((field) => {
                  if (!currentWord.includes(`${field.value}:`)) return null;
                  
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
                          return `${input.trim()} `;
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
                        setInputValue(`${search} `);
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
                        className="ml-1 hidden rounded-md p-0.5 hover:bg-background group-aria-[selected=true]:block"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandEmpty>No results found.</CommandEmpty>
            </CommandList>
            <div
              className="flex flex-wrap justify-between gap-3 border-t bg-accent/50 px-2 py-1.5 text-sm text-accent-foreground"
              cmdk-footer=""
            >
              <div className="flex flex-wrap gap-3">
                <span>
                  Use <Kbd variant="outline">↑</Kbd>{" "}
                  <Kbd variant="outline">↓</Kbd> to navigate
                </span>
                <span>
                  <Kbd variant="outline">Enter</Kbd> to select
                </span>
                <span>
                  <Kbd variant="outline">Esc</Kbd> to close
                </span>
                <Separator orientation="vertical" className="my-auto h-3" />
                <span>
                  Example: <Kbd variant="outline">name:john age:25</Kbd>
                </span>
              </div>
              {lastSearches.length > 0 && (
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
              )}
            </div>
          </div>
        </div>
      </Command>
    </div>
  );
}