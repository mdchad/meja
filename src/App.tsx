import { ConnectionManager } from "@/components/ConnectionManager";
import { DatabaseSidebar } from "@/components/DatabaseSidebar";
import { DataTable } from "@/components/DataTable";

function App() {
  return (
    <div className="min-h-screen bg-background w-screen font-sans">
      <div className="grid grid-cols-[200px_1fr] min-w-0 h-screen">
        <DatabaseSidebar />
        <div className="min-w-0">
          <header className="border-b border-tint-100 bg-tint-300 flex-shrink-0">
            <div className="grid grid-cols-[1fr_auto]">
              {/*<div className="mr-4 flex">*/}
              {/*  <h1 className="text-lg font-semibold">Meja 🗃️</h1>*/}
              {/*</div>*/}
              <div data-tauri-drag-region className="flex flex-1 w-full"></div>
              <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end px-4 p-2">
                <ConnectionManager />
              </div>
            </div>
          </header>
          <div className="flex-1 min-h-0">
            <DataTable />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
