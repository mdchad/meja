import { create } from 'zustand';

export interface ConnectionConfig {
  connectionUrl?: string;
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

// Mock data for development
const mockDatabases: DatabaseInfo[] = [
  {
    name: 'ecommerce',
    collections: ['users', 'products', 'orders', 'categories']
  },
  {
    name: 'blog',
    collections: ['posts', 'comments', 'tags', 'authors']
  },
  {
    name: 'analytics',
    collections: ['events', 'sessions', 'users']
  }
];

const mockCollectionData: Record<string, any[]> = {
  users: [
    { _id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com', age: 30, active: true, createdAt: new Date('2024-01-15') },
    { _id: '507f1f77bcf86cd799439012', name: 'Jane Smith', email: 'jane@example.com', age: 25, active: true, createdAt: new Date('2024-01-16') },
    { _id: '507f1f77bcf86cd799439013', name: 'Bob Johnson', email: 'bob@example.com', age: 35, active: false, createdAt: new Date('2024-01-17') },
    { _id: '507f1f77bcf86cd799439014', name: 'Alice Brown', email: 'alice@example.com', age: 28, active: true, createdAt: new Date('2024-01-18') },
    { _id: '507f1f77bcf86cd799439015', name: 'Charlie Wilson', email: 'charlie@example.com', age: 42, active: true, createdAt: new Date('2024-01-19') }
  ],
  products: [
    { _id: '507f1f77bcf86cd799439021', name: 'MacBook Pro', price: 1999, category: 'Electronics', inStock: true, rating: 4.8 },
    { _id: '507f1f77bcf86cd799439022', name: 'iPhone 15', price: 999, category: 'Electronics', inStock: true, rating: 4.7 },
    { _id: '507f1f77bcf86cd799439023', name: 'AirPods Pro', price: 249, category: 'Electronics', inStock: false, rating: 4.6 },
    { _id: '507f1f77bcf86cd799439024', name: 'iPad Air', price: 599, category: 'Electronics', inStock: true, rating: 4.5 }
  ],
  posts: [
    { _id: '507f1f77bcf86cd799439031', title: 'Getting Started with React', content: 'React is a popular...', author: 'John Doe', tags: ['react', 'javascript'], publishedAt: new Date('2024-01-20') },
    { _id: '507f1f77bcf86cd799439032', title: 'Building with Tauri', content: 'Tauri is amazing...', author: 'Jane Smith', tags: ['tauri', 'rust'], publishedAt: new Date('2024-01-21') },
    { _id: '507f1f77bcf86cd799439033', title: 'Database Design Tips', content: 'When designing...', author: 'Bob Johnson', tags: ['database', 'mongodb'], publishedAt: new Date('2024-01-22') }
  ]
};

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

  // Connect to MongoDB (mock implementation)
  connect: async (config: ConnectionConfig) => {
    set({ isConnecting: true, connectionError: null });
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Mock successful connection
      set({
        connectionConfig: config,
        isConnected: true,
        isConnecting: false,
        databases: mockDatabases
      });
    } catch (error) {
      set({
        isConnecting: false,
        connectionError: 'Mock connection failed'
      });
    }
  },

  // Disconnect from MongoDB
  disconnect: async () => {
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
    set({ selectedCollection: collectionName, isLoading: true });
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const data = mockCollectionData[collectionName] || [];
    
    set({
      tableData: data.slice(0, get().pageSize),
      totalCount: data.length,
      currentPage: 1,
      isLoading: false
    });
  },

  // Load table data for a specific page
  loadTableData: async (page = 1) => {
    const { selectedCollection, pageSize } = get();
    if (!selectedCollection) return;

    set({ isLoading: true, currentPage: page });
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const data = mockCollectionData[selectedCollection] || [];
    const skip = (page - 1) * pageSize;
    
    set({ 
      tableData: data.slice(skip, skip + pageSize),
      isLoading: false 
    });
  },

  // Set page size
  setPageSize: (size: number) => {
    set({ pageSize: size });
    // Reload current page with new page size
    get().loadTableData(get().currentPage);
  }
}));