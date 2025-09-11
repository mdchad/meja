import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppStore, ConnectionConfig } from '@/lib/store';
import { Database, Loader2, Plus, Unplug } from 'lucide-react';

export function ConnectionManager() {
  const {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect
  } = useAppStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectionType, setConnectionType] = useState<'url' | 'manual'>('url');
  const [formData, setFormData] = useState<ConnectionConfig>({
    connection_url: import.meta.env.VITE_DB_URL || 'mongodb://localhost:27017',
    host: 'localhost',
    port: 27017,
    database: '',
    username: '',
    password: '',
    auth_database: 'admin',
    ssl: false
  });

  const handleConnect = async () => {
    const config = connectionType === 'url' 
      ? parseConnectionUrl(formData.connection_url!)
      : formData;
    await connect(config);
    if (useAppStore.getState().isConnected) {
      setIsDialogOpen(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4" />
        {/*<span className="text-sm font-medium">MongoDB</span>*/}
        {isConnected ? (
          <Badge variant="default" className="bg-green-500">
            Connected
          </Badge>
        ) : (
          <Badge variant="secondary">Disconnected</Badge>
        )}
      </div>

      {isConnected ? (
        <div className="flex items-center gap-2">
          {/*<span className="text-xs text-muted-foreground">*/}
          {/*  {connectionConfig?.connection_url || `${connectionConfig?.host}:${connectionConfig?.port}`}*/}
          {/*</span>*/}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="h-8"
          >
            <Unplug className="h-3 w-3 mr-1" />
            Disconnect
          </Button>
        </div>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <Plus className="h-3 w-3 mr-1" />
              Connect
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect to MongoDB</DialogTitle>
              <DialogDescription>
                Enter your MongoDB connection details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Connection Type Toggle */}
              <div className="flex space-x-1 bg-muted p-1 rounded-md">
                <button
                  type="button"
                  className={`flex-1 px-3 py-2 text-sm rounded-sm transition-colors ${
                    connectionType === 'url' 
                      ? 'bg-background shadow-sm text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setConnectionType('url')}
                >
                  Connection URL
                </button>
                <button
                  type="button"
                  className={`flex-1 px-3 py-2 text-sm rounded-sm transition-colors ${
                    connectionType === 'manual' 
                      ? 'bg-background shadow-sm text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setConnectionType('manual')}
                >
                  Manual Setup
                </button>
              </div>

              {connectionType === 'url' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">MongoDB Connection URL</label>
                  <Input
                    value={formData.connection_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, connection_url: e.target.value }))}
                    placeholder="mongodb://localhost:27017/mydb"
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: mongodb://localhost:27017 or mongodb+srv://user:pass@cluster.mongodb.net/database
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Host</label>
                      <Input
                        value={formData.host}
                        onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Port</label>
                      <Input
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 27017 }))}
                        placeholder="27017"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Database (optional)</label>
                    <Input
                      value={formData.database}
                      onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
                      placeholder="my_database"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Username (optional)</label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Password (optional)</label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auth Database</label>
                    <Input
                      value={formData.auth_database}
                      onChange={(e) => setFormData(prev => ({ ...prev, auth_database: e.target.value }))}
                      placeholder="admin"
                    />
                  </div>
                </div>
              )}

              {connectionError && (
                <div className="p-3 bg-destructive/15 text-destructive text-sm rounded-md">
                  {connectionError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isConnecting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function parseConnectionUrl(url: string): ConnectionConfig {
  try {
    const parsed = new URL(url);
    
    return {
      connection_url: url,
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port) || 27017,
      database: parsed.pathname.slice(1) || undefined,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      ssl: parsed.protocol === 'mongodb+srv:' || parsed.searchParams.get('ssl') === 'true',
      auth_database: parsed.searchParams.get('authSource') || 'admin'
    };
  } catch (error) {
    // Fallback for invalid URLs
    return {
      host: 'localhost',
      port: 27017
    };
  }
}