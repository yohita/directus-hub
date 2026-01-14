# DirectusCloud - Quick Reference Guide

## 🚀 Getting Started

### Installation
```bash
cd ~/Study/directus-multimode
npm run install:all
```

### Start (Development Mode)
```bash
./start.sh
# or
npm run dev
```

### Stop
```bash
./stop.sh
```

---

## 📍 Accessing the Application

### Development Mode
- **Frontend UI**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

### Production Mode  
- **Everything**: http://localhost:3001

---

## 🎯 Common Commands

### Development
```bash
# Start both servers
./start.sh

# Stop all services
./stop.sh

# Install dependencies
npm run install:all
```

### Production
```bash
# Build frontend
npm run build

# Run in production
NODE_ENV=production ./start.sh

# Or start backend only (serves frontend)
NODE_ENV=production npm start
```

### Managing Instances
```bash
# List PM2 processes (Directus instances)
cd backend && npx pm2 list

# View logs for a specific instance
cd backend && npx pm2 logs directus-<subdomain>

# Stop all PM2 instances
cd backend && npx pm2 stop all

# Kill PM2 daemon
cd backend && npx pm2 kill
```

---

## 📂 Project Structure

```
directus-multimode/
├── backend/              # Express API server
│   ├── config/          # Database config
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── data/            # SQLite DB & PM2 data
│   └── server.js        # Main server
├── frontend/            # React UI
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   └── main.jsx    
│   └── dist/           # Production build
├── start.sh            # Unified start script
├── stop.sh             # Stop script
└── package.json        # Root package

~/directus-cloud/        # All instance data
├── instances/
│   ├── <uuid-1>/       # Instance 1
│   ├── <uuid-2>/       # Instance 2
│   └── ...
└── Caddyfile           # Auto-generated
```

---

## 🔧 Configuration

### Backend Environment (.env)
```env
PORT=3001
NODE_ENV=development
DIRECTUS_CLOUD_DIR=/Users/amitkulkarni/directus-cloud
STARTING_PORT=8910
CADDY_HTTP_PORT=8080
CADDY_HTTPS_PORT=8443
```

### Port Usage
- `3001` - Backend API
- `5173` - Frontend (dev only)
- `8080` - Caddy HTTP
- `8443` - Caddy HTTPS  
- `8910+` - Directus instances

---

## 🎨 Creating an Instance

1. **Open UI**: http://localhost:5173
2. **Click** "Create Instance"
3. **Fill Form**:
   - Name: "My Blog"
   - Subdomain: auto-generated
   - Database: SQLite (easiest)
   - Admin Email & Password
4. **Wait** ~1-2 minutes for installation
5. **Start** instance from dashboard
6. **Access** at http://localhost:<port>

---

## 🔌 API Endpoints

### Instances
- `GET /api/instances` - List all
- `POST /api/instances` - Create
- `GET /api/instances/:id` - Details
- `PUT /api/instances/:id` - Update
- `DELETE /api/instances/:id` - Delete
- `POST /api/instances/:id/start` - Start
- `POST /api/instances/:id/stop` - Stop
- `POST /api/instances/:id/restart` - Restart

### Files
- `GET /api/files/:instanceId?path=<path>` - List files
- `GET /api/files/:instanceId/content?path=<path>` - Get content
- `PUT /api/files/:instanceId/content` - Update file

### Caddy
- `GET /api/caddy/status` - Status
- `POST /api/caddy/generate` - Generate config
- `POST /api/caddy/reload` - Reload

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
./stop.sh
# or manually
pkill -f "node.*server.js"
pkill -f "vite"
```

### Instance Won't Start
```bash
cd backend
npx pm2 list
npx pm2 logs directus-<subdomain>
```

### Clean Restart
```bash
./stop.sh
cd backend && npx pm2 kill
./start.sh
```

### Database Issues
```bash
# Backup and reset
cp backend/data/directuscloud.db backend/data/directuscloud.db.backup
rm backend/data/directuscloud.db
./start.sh  # Will recreate DB
```

---

## 🌟 Features

- ✅ Create unlimited Directus instances
- ✅ SQLite, PostgreSQL, MySQL support
- ✅ Built-in file manager with Monaco editor
- ✅ Auto-reload on extension changes
- ✅ PM2 process management
- ✅ Caddy reverse proxy support
- ✅ Beautiful modern UI
- ✅ No sudo required
- ✅ Single command start/stop

---

## 📝 Development Tips

### Hot Reload
Both frontend and backend support hot reload in development mode.

### Debugging
- Backend logs: visible in console
- Frontend: Use browser DevTools
- Directus logs: `npx pm2 logs`

### Building for Production
```bash
npm run build
NODE_ENV=production npm start
```

The backend will serve the built frontend.

---

## 🔐 Security

- Each instance has isolated database
- User-level permissions only
- Credentials stored in manager DB
- File manager has path validation
- Use HTTPS via Caddy for production

---

## 📞 Quick Help

**Application won't start?**
- Check Node.js version: `node --version` (need 18+)
- Run `npm run install:all`
- Check ports aren't in use

**Can't create instance?**
- Check disk space
- Review backend logs in console
- Ensure network connection

**Caddy not working?**
- Install: `brew install caddy`
- Check: `which caddy`

---

**Made with ❤️ for the Directus community**
