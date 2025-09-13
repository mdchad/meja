import {useEffect, useState} from 'react';
import { ConnectionManager } from '@/components/ConnectionManager';
import { DatabaseSidebar } from '@/components/DatabaseSidebar';
import { DataTable } from '@/components/DataTable';
import { useAppStore } from '@/lib/store.ts';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable.tsx';

function App() {
  const { isConnected, selectedCollection, selectedDatabase, initializeConnection } = useAppStore();
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Initialize connection on app startup
  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  return (
    <div className="min-h-screen bg-background w-screen font-geist-mono">
      {/*<div className="grid grid-cols-[200px_1fr] min-w-0 h-screen">*/}
      <ResizablePanelGroup
        direction="horizontal"
        className="h-svh min-w-0"
      >
        <ResizablePanel defaultSize={15} maxSize={40} order={1}>
          <DatabaseSidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel className="min-w-0" order={2}>
          {/*<div className="min-w-0">*/}
            <header className="border-b border-tint-100 bg-tint-300 flex-shrink-0">
              <div className="grid grid-cols-[1fr_auto]">
                {/*<div className="mr-4 flex">*/}
                {/*  <h1 className="text-lg font-semibold">Meja 🗃️</h1>*/}
                {/*</div>*/}
                <div data-tauri-drag-region className="flex flex-1 w-full items-center px-6">
                  {isConnected && (
                    <h2 className="text-base font-light">
                      <span className="text-zinc-600/50">{selectedDatabase} / </span>
                      <span>{selectedCollection}</span>
                    </h2>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end px-4 p-2">
                  <ConnectionManager />
                </div>
              </div>
            </header>
            <div className="flex-1 min-h-0">
              <DataTable />
            </div>
        </ResizablePanel>
        { showRightPanel && (
          <>
            <ResizableHandle />
            <ResizablePanel id="right" order={3} defaultSize={15} maxSize={40}>
              <div className="h-full"></div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

export default App;
