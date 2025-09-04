import { useAppStore } from '@/lib/store';
import { Database, Table, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function DatabaseSidebar() {
  const {
    databases,
    selectedDatabase,
    selectedCollection,
    selectDatabase,
    selectCollection,
    isConnected
  } = useAppStore();

  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());

  const toggleDatabase = (dbName: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(dbName)) {
      newExpanded.delete(dbName);
    } else {
      newExpanded.add(dbName);
    }
    setExpandedDatabases(newExpanded);
  };

  const handleDatabaseClick = async (dbName: string) => {
    await selectDatabase(dbName);
    toggleDatabase(dbName);
  };

  const handleCollectionClick = async (collectionName: string) => {
    await selectCollection(collectionName);
  };

  if (!isConnected) {
    return (
      <div className="border-r border-tint-100 bg-tint-200 p-4">
        <div className="text-center text-muted-foreground">
          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Connect to a database to browse collections</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-r border-tint-100 bg-tint-200">
      <div className="p-4 border-b">
        <h3 className="font-medium text-sm">Databases</h3>
      </div>
      
      <div className="p-2">
        {databases.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            <p className="text-sm">No databases found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {databases.map((db) => (
              <div key={db.name}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-8 px-2 ${
                    selectedDatabase === db.name ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleDatabaseClick(db.name)}
                >
                  {expandedDatabases.has(db.name) ? (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronRight className="h-3 w-3 mr-1" />
                  )}
                  <Database className="h-3 w-3 mr-2" />
                  <span className="text-sm truncate">{db.name}</span>
                </Button>

                {expandedDatabases.has(db.name) && (
                  <div className="ml-6 space-y-1">
                    {db.collections.map((collection) => (
                      <Button
                        key={collection}
                        variant="ghost"
                        className={`w-full justify-start h-7 px-2 text-xs ${
                          selectedCollection === collection ? 'bg-accent' : ''
                        }`}
                        onClick={() => handleCollectionClick(collection)}
                      >
                        <Table className="h-3 w-3 mr-2" />
                        <span className="truncate">{collection}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}