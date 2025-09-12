# Meja 🗃️

A modern GUI database client built with Tauri v2, designed to connect to any local or cloud database with a beautiful, intuitive interface.

## Features

- **Multi-Database Support**: Connect to MongoDB (with more databases coming soon)
- **Modern UI**: Beautiful interface built with shadcn/ui and Tailwind CSS
- **Powerful Table Views**: Advanced data visualization using TanStack Table
- **Fast & Secure**: Rust-powered backend with memory safety and native performance
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Tech Stack

- **Frontend**: React 18, TypeScript, shadcn/ui, Tailwind CSS
- **Backend**: Tauri v2 (Rust)
- **Database**: MongoDB JavaScript Driver
- **Table Component**: TanStack Table
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js (>=18.0.0)
- Bun (>=1.0.0) or npm/yarn
- Rust (for Tauri development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```

### Development

Start the development server:
```bash
bun run tauri:dev
```

This will start both the Vite dev server and the Tauri application.

### Building

Build for production:
```bash
bun run tauri:build
```

## Database Connections

### MongoDB

Meja supports connecting to:
- Local MongoDB instances
- MongoDB Atlas (cloud)
- MongoDB with authentication

Simply provide your connection details in the connection dialog, and Meja will handle the rest.

## Project Structure

This project is created from [voidique/tauri-shadcn-tailwind-boilerplate](https://github.com/voidique/tauri-shadcn-tailwind-boilerplate). Inspired from [hbina/mongodb-gui](https://github.com/hbina/mongodb-gui)

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── ConnectionManager.tsx
│   ├── DatabaseSidebar.tsx
│   └── DataTable.tsx
├── lib/
│   ├── database.ts      # Database connection logic
│   └── store.ts         # Zustand state management
├── App.tsx              # Main application
└── main.tsx             # React entry point

src-tauri/               # Tauri backend
├── src/                 # Rust code
├── Cargo.toml          # Rust dependencies
└── tauri.conf.json     # Tauri configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
