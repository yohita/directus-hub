# Project Structure Cleanup - Migration Guide

## What Changed?

Your DirectusCloud project has been cleaned up to reflect its actual architecture: a **unified Express/EJS server-side application**.

### Old Structure (Removed)
```
directus-multimode/
├── backend/           # ❌ REMOVED - Old backend folder
│   ├── server.js
│   ├── routes/
│   ├── services/
│   └── data/
└── frontend/          # ❌ REMOVED - Old frontend folder
    ├── src/
    └── vite.config.js
```

### New Structure (Current)
```
directus-multimode/
├── app/               # ✅ Main application (Express + EJS)
│   ├── server.js      # Main server file
│   ├── api/           # API routes
│   ├── lib/           # Services (instanceService, pm2Service, etc.)
│   ├── views/         # EJS templates
│   └── public/        # Static assets
├── data/              # ✅ Application data (moved from backend/data)
│   └── .pm2/          # PM2 process manager data
├── instances/         # Directus instance directories
├── .env               # ✅ Environment variables (moved from backend/.env)
├── start.sh           # ✅ Updated start script
├── stop.sh            # ✅ Updated stop script
└── package.json       # ✅ Updated with new scripts
```

## Migration Details

### 1. Removed Folders
- **`backend/`** - Old backend architecture from previous version
- **`frontend/`** - Old React/Vite frontend from previous version

### 2. Moved Files/Folders
- **`backend/data/.pm2`** → **`data/.pm2`** - PM2 process data
- **`backend/.env`** → **`.env`** - Environment variables (already existed)

### 3. Updated Files

#### `app/lib/pm2Service.js`
- Updated `PM2_HOME` path to use the root `data/.pm2` directory
- Now uses absolute path resolution for better reliability

#### `start.sh`
- **Before**: Started both backend and frontend servers separately
- **After**: Starts only the unified Express server
- Added dependency checks and better environment handling
- Simplified development/production mode switching

#### `stop.sh`
- **Before**: Stopped backend, frontend, and checked PM2 in backend folder
- **After**: Stops unified server and checks PM2 in root data folder
- Updated PM2_HOME path to `./data/.pm2`

#### `package.json`
- **Added Scripts**:
  - `npm run pm2:list` - List all PM2 processes (Directus instances)
  - `npm run pm2:stop` - Stop all PM2 processes
  - `npm run pm2:logs` - View PM2 logs

## How to Use

### Starting the Application

**Development Mode** (with auto-reload):
```bash
./start.sh
# or
npm run dev
```

**Production Mode**:
```bash
NODE_ENV=production ./start.sh
# or
NODE_ENV=production npm start
```

### Stopping the Application

```bash
./stop.sh
# or
npm run stop
```

### Managing Directus Instances (PM2)

**List all running instances**:
```bash
npm run pm2:list
```

**Stop all instances**:
```bash
npm run pm2:stop
```

**View instance logs**:
```bash
npm run pm2:logs
```

**Manual PM2 commands** (if needed):
```bash
PM2_HOME=./data/.pm2 npx pm2 <command>
```

## Environment Variables

Your `.env` file is now in the project root. Make sure it contains:
```env
PORT=3001
NODE_ENV=development
INSTANCES_DIR=./instances
STARTING_PORT=8055
```

## Testing the Changes

1. **Start the server**:
   ```bash
   ./start.sh
   ```

2. **Access the dashboard**:
   - Open browser: `http://localhost:3001`

3. **Verify PM2 is working**:
   - Create a new instance from the dashboard
   - Start the instance
   - Run `npm run pm2:list` to see it running

4. **Stop everything**:
   ```bash
   ./stop.sh
   ```

## Benefits of This Cleanup

✅ **Simplified Architecture** - One unified Express app instead of scattered backend/frontend  
✅ **Cleaner Project Structure** - No unused folders cluttering the project  
✅ **Better Organization** - All config, data, and logs at the root level  
✅ **Easier Maintenance** - Single source of truth for the application  
✅ **Improved Scripts** - More intuitive start/stop scripts  
✅ **Better PM2 Management** - Convenient npm scripts for PM2 operations  

## Rollback (If Needed)

If you need to rollback, you would need to restore from git:
```bash
git checkout HEAD -- backend frontend start.sh stop.sh
```

However, this is **not recommended** as the old structure is deprecated.

## Questions?

The application architecture is now:
- **Backend**: Express.js server (`app/server.js`)
- **Frontend**: EJS templates rendered server-side (`app/views/`)
- **API**: RESTful endpoints (`app/api/`)
- **Services**: Business logic (`app/lib/`)

This is a **server-side rendered (SSR)** application, not a Next.js app. All rendering happens on the server, which is simpler and more appropriate for this use case.
