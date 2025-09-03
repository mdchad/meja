import { create } from 'zustand';
import {mongodb_connect} from "@/util.ts";
// Dynamically import Tauri API only when available
let invokeFunction: any = null;

try {
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    invokeFunction = require('@tauri-apps/api/core').invoke;
  }
} catch (e) {
  console.warn('Tauri API not available:', e);
}

export interface ConnectionConfig {
  connection_url?: string;
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  auth_database?: string;
  ssl?: boolean;
}

export interface DatabaseInfo {
  name: string;
  collections: string[];
}

export interface AppState {
  // Connection state
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

  // Connect to MongoDB via Tauri backend
  connect: async (config: ConnectionConfig) => {
    set({ isConnecting: true, connectionError: null });
    
    try {
      // Check if we're in Tauri environment
      // Use simpler parameters like the working example
      // const result = await invokeFunction('mongodb_connect', {
      //   url: config.host,
      //   port: config.port
      // });

      const result = await mongodb_connect({
        url: config.connection_url!,
        port: config.port,
      });

      // Parse the result to extract databases
      const databases: DatabaseInfo[] = Object.keys(result).map(dbName => ({
        name: dbName,
        collections: result[dbName].collections?.map((col: any) => col.name) || []
      }));

      set({
        connectionConfig: config,
        isConnected: true,
        isConnecting: false,
        databases,
        connectionError: null
      });
    } catch (error) {
      console.error('Connection failed:', error);
      const errorMessage = typeof error === 'string' ? error : 'Connection failed';
      set({
        isConnecting: false,
        connectionError: errorMessage
      });
    }
  },

  // Disconnect from MongoDB
  disconnect: async () => {
    try {
      if (invokeFunction) {
        // No disconnect command needed for sync approach
      }
    } catch (error) {
      console.warn('Error disconnecting:', error);
    }
    
    set({
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
    const { selectedDatabase } = get();
    if (!selectedDatabase) return;

    set({ selectedCollection: collectionName, isLoading: true });
    
    try {
      if (!invokeFunction) {
        throw new Error('Tauri API not available');
      }

      const documents = await invokeFunction('mongodb_find_documents', {
        database_name: selectedDatabase,
        collection_name: collectionName,
        page: 0,
        per_page: get().pageSize,
        documents_filter: {},
        documents_projection: {},
        documents_sort: {}
      });
      
      const total_count = await invokeFunction('mongodb_count_documents', {
        database_name: selectedDatabase,
        collection_name: collectionName,
        documents_filter: {}
      });
      
      set({
        tableData: documents,
        totalCount: total_count,
        currentPage: 1,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load collection data:', error);
      set({ 
        isLoading: false,
        connectionError: typeof error === 'string' ? error : 'Failed to load collection data'
      });
    }
  },

  // Load table data for a specific page
  loadTableData: async (page = 1) => {
    const { selectedDatabase, selectedCollection, pageSize } = get();
    if (!selectedDatabase || !selectedCollection) return;

    set({ isLoading: true, currentPage: page });
    
    try {
      if (!invokeFunction) {
        throw new Error('Tauri API not available');
      }

      const documents = await invokeFunction('mongodb_find_documents', {
        database_name: selectedDatabase,
        collection_name: selectedCollection,
        page: page - 1,
        per_page: pageSize,
        documents_filter: {},
        documents_projection: {},
        documents_sort: {}
      });
      
      set({ tableData: documents, isLoading: false });
    } catch (error) {
      console.error('Failed to load table data:', error);
      set({ 
        isLoading: false,
        connectionError: typeof error === 'string' ? error : 'Failed to load table data'
      });
    }
  },

  // Set page size
  setPageSize: (size: number) => {
    set({ pageSize: size });
    // Reload current page with new page size
    get().loadTableData(get().currentPage);
  }
}));