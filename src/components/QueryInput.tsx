import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { Search, X, AlertCircle } from 'lucide-react';

export function QueryInput() {
  const { 
    currentQuery, 
    queryError, 
    isQueryActive, 
    isLoading,
    executeQuery, 
    clearQuery 
  } = useAppStore();
  
  const [localQuery, setLocalQuery] = useState(currentQuery);

  const handleExecuteQuery = async () => {
    await executeQuery(localQuery);
  };

  const handleClearQuery = () => {
    setLocalQuery('');
    clearQuery();
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      await handleExecuteQuery();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            style={{ 'fontVariantLigatures': 'none' }}
            placeholder='{ \"field\": \"value\" }'
            value={localQuery}
            spellCheck={false}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="font-mono text-sm"
            disabled={isLoading}
          />
          {isQueryActive && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          )}
        </div>
        
        <Button 
          onClick={handleExecuteQuery}
          disabled={isLoading}
          size="sm"
          variant="outline"
        >
          <Search className="h-4 w-4" />
          Query
        </Button>
        
        {isQueryActive && (
          <Button 
            onClick={handleClearQuery}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
      
      {queryError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="h-4 w-4" />
          <span>{queryError}</span>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">
        Use MongoDB query syntax. Press Cmd/Ctrl+Enter to execute.
        {isQueryActive && <span className="text-green-600 ml-2">• Query active</span>}
      </div>
    </div>
  );
}