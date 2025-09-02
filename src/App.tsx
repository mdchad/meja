import { ConnectionManager } from "@/components/ConnectionManager";
import { DatabaseSidebar } from "@/components/DatabaseSidebar";
import { DataTable } from "@/components/DataTable";

function App() {
  console.log('App component rendering');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="mr-4 flex">
            <h1 className="text-lg font-semibold">Meja 🗃️</h1>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <ConnectionManager />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        <DatabaseSidebar />
        <DataTable />
      </div>
    </div>
  );
}

export default App;
