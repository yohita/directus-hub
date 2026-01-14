# DirectusCloud - Multi-Instance Directus Hosting Platform

A powerful web-based management application that allows you to create, manage, and host multiple Directus CMS instances on a single server. Each instance runs independently with its own database, storage, and configuration.

![DirectusCloud Banner](https://img.shields.io/badge/DirectusCloud-Multi--Instance-blueviolet)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.2.0-blue)

## ✨ Features

- **Multi-Instance Management**: Create and manage unlimited Directus instances
- **No Sudo Required**: Runs entirely with user permissions (ports >1024)
- **HTTP & HTTPS Support**: Caddy handles automatic SSL certificates via Let's Encrypt
- **Built-in File Manager**: Monaco editor for managing instance files
- **Auto-reload Extensions**: Watch for changes in extensions folder and auto-restart
- **Centralized Structure**: All data stored in `~/directus-cloud/` folder
- **Process Management**: PM2 integration for reliable instance management
- **Modern UI**: Beautiful React interface with Tailwind CSS

## 🏗️ Architecture

```
directus-multimode/
├── backend/              # Node.js Express API
│   ├── config/          # Database configuration
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── server.js        # Main server file
├── frontend/            # React + Vite application
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   └── main.jsx    # Entry point
│   └── vite.config.js
└── README.md

~/directus-cloud/        # All instances and data
├── instances/
│   ├── <instance-id-1>/
│   ├── <instance-id-2>/
│   └── ...
└── Caddyfile           # Auto-generated reverse proxy config
```

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Caddy** (optional, for reverse proxy with HTTPS)
  - macOS: `brew install caddy`
  - Linux: See [Caddy installation guide](https://caddyserver.com/docs/install)

## 🚀 Quick Start

### 1. Navigate to the project directory

```bash
cd ~/Study/directus-multimode
```

### 2. Install all dependencies

```bash
npm run install:all
```

This installs dependencies for both backend and frontend.

## 🎯 Usage

### Development Mode (Recommended for Development)

Run both frontend and backend with a single command:

```bash
./start.sh
```

Or using npm:

```bash
npm run dev
```

This will start:
- **Backend API**: `http://localhost:3001`
- **Frontend UI**: `http://localhost:5173`

The frontend automatically proxies API calls to the backend.

### Production Mode

Build and run in production:

```bash
NODE_ENV=production ./start.sh
```

Or build separately:

```bash
# Build frontend
npm run build

# Start backend (serves frontend)
NODE_ENV=production npm start
```

In production mode:
- Backend serves the built frontend from a single port
- Everything runs on `http://localhost:3001`

### Stop All Services

```bash
./stop.sh
```

Or manually:

```bash
pkill -f "node.*server.js"
pkill -f "vite"
```

### Create Your First Instance

1. Open the application (development: `http://localhost:5173` or production: `http://localhost:3001`)
2. Click **"Create Instance"**
3. Fill in the form:
   - **Instance Name**: e.g., "My Blog"
   - **Subdomain**: e.g., "blog" (auto-generated from name)
   - **Database Type**: SQLite (recommended for testing)
   - **Admin Email**: your-email@example.com
   - **Admin Password**: minimum 8 characters
4. Click **"Create Instance"**
5. Wait for installation (~1-2 minutes)
6. **Start** the instance from the dashboard
7. Access your Directus instance!

### Access Instances

Each instance can be accessed in two ways:

1. **Direct Port Access**: `http://localhost:<port>`
2. **Subdomain via Caddy**: `http://<subdomain>.localhost:8080`

## 🎨 Key Features Explained

### Instance Management

- **Create**: Set up new Directus instances with custom configurations
- **Start/Stop/Restart**: Control instance lifecycle
- **Delete**: Remove instances and all associated data
- **Monitor**: View real-time status and logs

### File Manager

- Browse instance files in a tree view
- Edit files directly with Monaco editor (VS Code engine)
- Syntax highlighting for multiple languages
- Save changes instantly

### Extension Auto-Reload

When enabled, the system watches the `extensions/` folder and automatically restarts the instance when files change - perfect for extension development!

### Caddy Reverse Proxy

DirectusCloud can automatically generate Caddyfile configurations for all instances, enabling:
- Clean subdomain-based access
- Automatic HTTPS with Let's Encrypt
- Load balancing and advanced routing

## 🔧 Configuration

### Database Options

Each instance supports:
- **SQLite**: File-based, zero configuration
- **PostgreSQL**: Production-grade relational database
- **MySQL**: Popular relational database

### Port Configuration

- Backend API: `3001` (configurable)
- Frontend Dev: `5173` (Vite default)
- Caddy HTTP: `8080` (configurable)
- Caddy HTTPS: `8443` (configurable)
- Directus Instances: Starting from `8910` (auto-incremented)

## 📚 API Documentation

The backend provides a RESTful API:

### Instances
- `GET /api/instances` - List all instances
- `POST /api/instances` - Create instance
- `GET /api/instances/:id` - Get instance details
- `PUT /api/instances/:id` - Update instance
- `DELETE /api/instances/:id` - Delete instance
- `POST /api/instances/:id/start` - Start instance
- `POST /api/instances/:id/stop` - Stop instance
- `POST /api/instances/:id/restart` - Restart instance
- `GET /api/instances/:id/logs` - Get instance logs

### Files
- `GET /api/files/:instanceId?path=<path>` - List files
- `GET /api/files/:instanceId/content?path=<path>` - Get file content
- `PUT /api/files/:instanceId/content` - Update file
- `POST /api/files/:instanceId/folder` - Create folder
- `DELETE /api/files/:instanceId?path=<path>` - Delete file/folder

### Caddy
- `GET /api/caddy/status` - Check Caddy status
- `POST /api/caddy/generate` - Generate Caddyfile
- `POST /api/caddy/reload` - Reload Caddy configuration

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Ensure Node.js 18+ is installed: `node --version`

### Instance creation fails
- Check backend logs in the terminal
- Ensure sufficient disk space
- Verify network connection for npm packages

### Caddy integration not working
- Install Caddy: `brew install caddy` (macOS)
- Check Caddy is in PATH: `which caddy`
- Review Caddyfile: `~/directus-cloud/Caddyfile`

### PM2 issues
- PM2 is installed locally, no global installation needed
- Check PM2 status: `cd backend && npx pm2 list`
- Reset PM2: `npx pm2 kill` then restart instances

## 🔐 Security Notes

- All instances run with user-level permissions
- Each instance has its own isolated database
- Admin credentials are stored in the manager database
- File manager has path validation to prevent directory traversal
- Consider using HTTPS (via Caddy) for production deployments

## 🚧 Development

### Build Frontend for Production

```bash
cd frontend
npm run build
```

The build output will be in `frontend/dist/`

### Backend Development

The backend uses ES modules and can be run with Node.js watch mode:

```bash
cd backend
npm run dev
```

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review backend logs for error details
- Ensure all prerequisites are installed

## 🎉 Credits

Built with:
- [Directus](https://directus.io/) - The headless CMS
- [Express.js](https://expressjs.com/) - Backend framework
- [React](https://react.dev/) - Frontend library
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [PM2](https://pm2.keymetrics.io/) - Process manager
- [Caddy](https://caddyserver.com/) - Reverse proxy

---

**Made with ❤️ for the Directus community**
