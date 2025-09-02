import { create } from 'zustand';
import { MongoClient } from 'mongodb';

export interface ConnectionConfig {
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  authDatabase?: string;
  ssl?: boolean;
}

export interface DatabaseInfo {
  name: string;
  collections: string[];
}

export interface AppState {
  // Connection state
  client: MongoClient | null;
  connectionConfig: ConnectionConfig | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Database state
  databases: DatabaseInfo[];
  selectedDatabase: string | null;
  selectedCollection: string | null;
  
  // Table data
  tableData: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  
  // Actions
  connect: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  selectDatabase: (dbName: string) => Promise<void>;
  selectCollection: (collectionName: string) => Promise<void>;
  loadTableData: (page?: number) => Promise<void>;
  setPageSize: (size: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  client: null,
  connectionConfig: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  databases: [],
  selectedDatabase: null,
  selectedCollection: null,
  tableData: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 50,
  isLoading: false,

  // Connect to MongoDB
  connect: async (config: ConnectionConfig) => {
    set({ isConnecting: true, connectionError: null });
    
    try {
      const connectionString = buildConnectionString(config);
      const client = new MongoClient(connectionString);
      
      await client.connect();
      
      // Test connection and get databases
      const adminDb = client.db().admin();
      const dbList = await adminDb.listDatabases();
      
      const databases: DatabaseInfo[] = [];
      for (const dbInfo of dbList.databases) {
        if (dbInfo.name !== 'admin' && dbInfo.name !== 'local' && dbInfo.name !== 'config') {
          const db = client.db(dbInfo.name);
          const collections = await db.listCollections().toArray();
          databases.push({
            name: dbInfo.name,
            collections: collections.map(col => col.name)
          });
        }
      }
      
      set({
        client,
        connectionConfig: config,
        isConnected: true,
        isConnecting: false,
        databases
      });
    } catch (error) {
      set({
        isConnecting: false,
        connectionError: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  },

  // Disconnect from MongoDB
  disconnect: async () => {
    const { client } = get();
    if (client) {
      await client.close();
    }
    
    set({
      client: null,
      connectionConfig: null,
      isConnected: false,
      databases: [],
      selectedDatabase: null,
      selectedCollection: null,
      tableData: [],
      totalCount: 0,
      currentPage: 1
    });
  },

  // Select a database
  selectDatabase: async (dbName: string) => {
    set({ selectedDatabase: dbName, selectedCollection: null, tableData: [], totalCount: 0 });
  },

  // Select a collection and load its data
  selectCollection: async (collectionName: string) => {
    const { client, selectedDatabase } = get();
    if (!client || !selectedDatabase) return;

    set({ selectedCollection: collectionName, isLoading: true });
    
    try {
      const db = client.db(selectedDatabase);
      const collection = db.collection(collectionName);
      
      // Get total count
      const totalCount = await collection.countDocuments();
      
      // Load first page
      const tableData = await collection
        .find({})
        .limit(get().pageSize)
        .toArray();
      
      set({
        tableData,
        totalCount,
        currentPage: 1,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load collection data:', error);
      set({ isLoading: false });
    }
  },

  // Load table data for a specific page
  loadTableData: async (page = 1) => {
    const { client, selectedDatabase, selectedCollection, pageSize } = get();
    if (!client || !selectedDatabase || !selectedCollection) return;

    set({ isLoading: true, currentPage: page });
    
    try {
      const db = client.db(selectedDatabase);
      const collection = db.collection(selectedCollection);
      
      const skip = (page - 1) * pageSize;
      const tableData = await collection
        .find({})
        .skip(skip)
        .limit(pageSize)
        .toArray();
      
      set({ tableData, isLoading: false });
    } catch (error) {
      console.error('Failed to load table data:', error);
      set({ isLoading: false });
    }
  },

  // Set page size
  setPageSize: (size: number) => {
    set({ pageSize: size });
    // Reload current page with new page size
    get().loadTableData(get().currentPage);
  }
}));

function buildConnectionString(config: ConnectionConfig): string {
  const { host, port, database, username, password, authDatabase, ssl } = config;
  
  let connectionString = 'mongodb://';
  
  if (username && password) {
    connectionString += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  
  connectionString += `${host}:${port}`;
  
  if (database) {
    connectionString += `/${database}`;
  }
  
  const params = new URLSearchParams();
  if (authDatabase) {
    params.append('authSource', authDatabase);
  }
  if (ssl) {
    params.append('ssl', 'true');
  }
  
  if (params.toString()) {
    connectionString += `?${params.toString()}`;
  }
  
  return connectionString;
}