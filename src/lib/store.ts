import { create } from 'zustand';
import {mongodb_connect, mongodb_count_documents, mongodb_find_documents} from "@/util.ts";
// Dynamically import Tauri API only when available

// Format data once when fetched to avoid expensive operations during rendering
function formatDocumentData(documents: any[]): any[] {
  return documents.map(doc => {
    const formattedDoc: any = {};
    for (const [key, value] of Object.entries(doc)) {
      formattedDoc[key] = formatValueForDisplay(value);
    }
    return formattedDoc;
  });
}

function formatValueForDisplay(value: any): any {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    if (value._id) return value._id.toString();
    if (value instanceof Date) return value.toISOString();
    
    // Format MongoDB ObjectId for display
    if (value && typeof value === 'object' && value.$oid && typeof value.$oid === 'string') {
      return `ObjectId("${value.$oid}")`;
    }
    
    // For other objects, keep full data - handle display limits in UI
    try {
      return JSON.stringify(value);
    } catch (error) {
      // Handle circular references or other stringify errors
      return '[Complex Object]';
    }
  }
  
  return value;
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
  
  // Query state
  currentQuery: string;
  queryError: string | null;
  queryFilter: Record<string, unknown>;
  isQueryActive: boolean;
  
  // Actions
  connect: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  selectDatabase: (dbName: string) => Promise<void>;
  selectCollection: (collectionName: string) => Promise<void>;
  loadTableData: (page?: number) => Promise<void>;
  setPageSize: (size: number) => void;
  executeQuery: (query: string) => Promise<void>;
  executeFilterQuery: (filterObject: Record<string, unknown>) => Promise<void>;
  clearQuery: () => void;
  initializeConnection: () => Promise<void>;
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
  
  // Query state
  currentQuery: '',
  queryError: null,
  queryFilter: {},
  isQueryActive: false,

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

      // Save connection config to localStorage for persistence
      try {
        localStorage.setItem('mongodb-connection-config', JSON.stringify(config));
        localStorage.setItem('mongodb-selected-database', get().selectedDatabase || '');
        localStorage.setItem('mongodb-selected-collection', get().selectedCollection || '');
      } catch (error) {
        console.warn('Failed to save connection config to localStorage:', error);
      }

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
        // No disconnect command needed for sync approach
        
        // Clear localStorage on disconnect
        localStorage.removeItem('mongodb-connection-config');
        localStorage.removeItem('mongodb-selected-database');
        localStorage.removeItem('mongodb-selected-collection');
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
    try {
      localStorage.setItem('mongodb-selected-database', dbName);
      localStorage.removeItem('mongodb-selected-collection'); // Clear collection when changing database
    } catch (error) {
      console.warn('Failed to save selected database to localStorage:', error);
    }
  },

  // Select a collection and load its data
  selectCollection: async (collectionName: string) => {
    const { selectedDatabase } = get();
    if (!selectedDatabase) return;

    set({ selectedCollection: collectionName, isLoading: true, currentQuery: '', queryError: null, isQueryActive: false });
    
    // Save selected collection to localStorage
    try {
      localStorage.setItem('mongodb-selected-collection', collectionName);
    } catch (error) {
      console.warn('Failed to save selected collection to localStorage:', error);
    }
    
    try {
      const documents = await mongodb_find_documents({
        databaseName: selectedDatabase,
        collectionName: collectionName,
        page: 0,
        perPage: get().pageSize,
        documentsFilter: {},
        documentsProjection: {},
        documentsSort: {}
      });
      
      const total_count = await mongodb_count_documents({
        databaseName: selectedDatabase,
        collectionName: collectionName,
        documentsFilter: {}
      });
      
      set({
        tableData: formatDocumentData(documents),
        totalCount: total_count,
        currentPage: 1,
        isLoading: false,
        queryFilter: {}
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
    const { selectedDatabase, selectedCollection, pageSize, queryFilter } = get();
    if (!selectedDatabase || !selectedCollection) return;

    set({ isLoading: true, currentPage: page });
    
    try {
      const documents = await mongodb_find_documents({
        databaseName: selectedDatabase,
        collectionName: selectedCollection,
        page: page - 1,
        perPage: pageSize,
        documentsFilter: queryFilter,
        documentsProjection: {},
        documentsSort: {}
      });

      set({ tableData: formatDocumentData(documents), isLoading: false });
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
  },

  // Execute a query
  executeQuery: async (query: string) => {
    const { selectedDatabase, selectedCollection, pageSize } = get();
    if (!selectedDatabase || !selectedCollection) return;

    // Clear previous query error
    set({ queryError: null, currentQuery: query });

    // Validate and parse JSON query
    let parsedQuery: Record<string, unknown>;
    try {
      if (query.trim() === '') {
        parsedQuery = {};
        set({ isQueryActive: false });
      } else {
        parsedQuery = JSON.parse(query);
        set({ isQueryActive: true });
      }
    } catch (error) {
      set({ queryError: 'Invalid JSON format' });
      return;
    }

    set({ isLoading: true, queryFilter: parsedQuery, currentPage: 1 });
    
    try {
      // Get documents with the query filter
      const documents = await mongodb_find_documents({
        databaseName: selectedDatabase,
        collectionName: selectedCollection,
        page: 0,
        perPage: pageSize,
        documentsFilter: parsedQuery,
        documentsProjection: {},
        documentsSort: {}
      });
      
      // Get total count with the filter
      const total_count = await mongodb_count_documents({
        databaseName: selectedDatabase,
        collectionName: selectedCollection,
        documentsFilter: parsedQuery
      });
      
      set({
        tableData: formatDocumentData(documents),
        totalCount: total_count,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to execute query:', error);
      set({ 
        isLoading: false,
        queryError: typeof error === 'string' ? error : 'Query execution failed'
      });
    }
  },

  // Execute a filter query (from filter command)
  executeFilterQuery: async (filterObject: Record<string, unknown>) => {
    const { selectedDatabase, selectedCollection, pageSize } = get();
    if (!selectedDatabase || !selectedCollection) return;

    // Clear previous query error and set filter as current query
    const queryString = Object.keys(filterObject).length > 0 ? JSON.stringify(filterObject, null, 2) : '';
    set({ 
      queryError: null, 
      currentQuery: queryString, 
      isQueryActive: Object.keys(filterObject).length > 0,
      queryFilter: filterObject,
      currentPage: 1,
      isLoading: true 
    });
    
    try {
      // Get documents with the filter
      const documents = await mongodb_find_documents({
        databaseName: selectedDatabase,
        collectionName: selectedCollection,
        page: 0,
        perPage: pageSize,
        documentsFilter: filterObject,
        documentsProjection: {},
        documentsSort: {}
      });
      
      // Get total count with the filter
      const total_count = await mongodb_count_documents({
        databaseName: selectedDatabase,
        collectionName: selectedCollection,
        documentsFilter: filterObject
      });
      
      set({
        tableData: formatDocumentData(documents),
        totalCount: total_count,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to execute filter query:', error);
      set({ 
        isLoading: false,
        queryError: typeof error === 'string' ? error : 'Filter query execution failed'
      });
    }
  },

  // Clear the current query
  clearQuery: async () => {
    const { selectedDatabase, selectedCollection, pageSize } = get();
    if (!selectedDatabase || !selectedCollection) return;

    set({ 
      currentQuery: '', 
      queryError: null, 
      queryFilter: {}, 
      isQueryActive: false,
      isLoading: true,
      currentPage: 1
    });

    try {
      // Reload data without any filters
      const documents = await mongodb_find_documents({
        databaseName: selectedDatabase,
        collectionName: selectedCollection,
        page: 0,
        perPage: pageSize,
        documentsFilter: {}, // Explicitly empty filter
        documentsProjection: {},
        documentsSort: {}
      });
      
      // Get total count without filters
      const total_count = await mongodb_count_documents({
        databaseName: selectedDatabase,
        collectionName: selectedCollection,
        documentsFilter: {} // Explicitly empty filter
      });
      
      set({
        tableData: formatDocumentData(documents),
        totalCount: total_count,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to clear query and reload data:', error);
      set({ 
        isLoading: false,
        connectionError: typeof error === 'string' ? error : 'Failed to reload data'
      });
    }
  },

  // Initialize connection from localStorage
  initializeConnection: async () => {
    try {
      const savedConfig = localStorage.getItem('mongodb-connection-config');
      const savedDatabase = localStorage.getItem('mongodb-selected-database');
      const savedCollection = localStorage.getItem('mongodb-selected-collection');
      
      if (!savedConfig) {
        console.log('No saved connection found in localStorage');
        return;
      }

      const config: ConnectionConfig = JSON.parse(savedConfig);
      console.log('Attempting to restore connection...');

      // Attempt to reconnect
      await get().connect(config);

      // Restore database selection if it exists
      if (savedDatabase) {
        const { databases } = get();
        const dbExists = databases.some(db => db.name === savedDatabase);
        if (dbExists) {
          await get().selectDatabase(savedDatabase);

          // Restore collection selection if it exists
          if (savedCollection) {
            const selectedDb = databases.find(db => db.name === savedDatabase);
            const collectionExists = selectedDb?.collections.includes(savedCollection);
            if (collectionExists) {
              await get().selectCollection(savedCollection);
            }
          }
        }
      }

      console.log('Connection restored successfully');
    } catch (error) {
      console.warn('Failed to restore connection:', error);
      // Don't show error to user on auto-reconnect failure, just silently fail
      set({ 
        connectionError: null, // Clear any connection error from failed auto-reconnect
        isConnecting: false 
      });
    }
  }
}));