import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import instanceService from './lib/instanceService.js';
import pm2Service from './lib/pm2Service.js';
import watcherService from './lib/watcherService.js';
import caddyService from './lib/caddyService.js';
import systemCheckerService from './lib/systemCheckerService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

//========================================
// DASHBOARD - Main Page
//========================================
app.get('/', async (req, res) => {
    try {
        const instances = instanceService.getAllInstances();
        const systemStatus = await systemCheckerService.checkAll();
        res.render('dashboard', { instances, systemStatus });
    } catch (error) {
        res.status(500).render('error', { error: error.message });
    }
});

//========================================
// API ENDPOINTS
//========================================

// Get all instances (API)
app.get('/api/instances', async (req, res) => {
    try {
        const instances = instanceService.getAllInstances();
        res.json(instances);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create instance with SSE progress
app.post('/api/instances/create', async (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (step, message, progress) => {
        res.write(`data: ${JSON.stringify({ step, message, progress })}\n\n`);
    };

    try {
        const instance = await instanceService.createInstanceWithProgress(req.body, sendProgress);
        await caddyService.generateCaddyfile();

        // Send completion event
        res.write(`data: ${JSON.stringify({
            step: 'complete',
            message: 'Instance created successfully!',
            progress: 100,
            instance
        })}\n\n`);
        res.end();
    } catch (error) {
        res.write(`data: ${JSON.stringify({
            step: 'error',
            message: error.message,
            progress: 0
        })}\n\n`);
        res.end();
    }
});

// Clone instance
app.post('/api/instances/:id/clone', async (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (step, message, progress) => {
        res.write(`data: ${JSON.stringify({ step, message, progress })}\n\n`);
    };

    try {
        const { name, subdomain } = req.body;
        const instance = await instanceService.cloneInstance(req.params.id, { name, subdomain }, sendProgress);
        await caddyService.generateCaddyfile();

        // Send completion event
        res.write(`data: ${JSON.stringify({
            step: 'complete',
            message: 'Instance cloned successfully!',
            progress: 100,
            instance
        })}\n\n`);
        res.end();
    } catch (error) {
        res.write(`data: ${JSON.stringify({
            step: 'error',
            message: error.message,
            progress: 0
        })}\n\n`);
        res.end();
    }
});

// Update instance
app.put('/api/instances/:id', async (req, res) => {
    try {
        const instance = instanceService.updateInstance(req.params.id, req.body);
        if (req.body.auto_reload !== undefined) {
            if (req.body.auto_reload) {
                watcherService.startWatching(req.params.id);
            } else {
                watcherService.stopWatching(req.params.id);
            }
        }
        res.json(instance);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete instance
app.delete('/api/instances/:id', async (req, res) => {
    try {
        try {
            await pm2Service.stopInstance(req.params.id);
        } catch (e) { }

        watcherService.stopWatching(req.params.id);
        const result = await instanceService.deleteInstance(req.params.id);
        await caddyService.generateCaddyfile();

        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Start instance
app.post('/api/instances/:id/start', async (req, res) => {
    try {
        const result = await pm2Service.startInstance(req.params.id);
        const instance = instanceService.getInstanceById(req.params.id);
        if (instance.auto_reload) {
            watcherService.startWatching(req.params.id);
        }
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Stop instance
app.post('/api/instances/:id/stop', async (req, res) => {
    try {
        const result = await pm2Service.stopInstance(req.params.id);
        watcherService.stopWatching(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Restart instance
app.post('/api/instances/:id/restart', async (req, res) => {
    try {
        const result = await pm2Service.restartInstance(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Toggle MCP
app.post('/api/instances/:id/mcp', async (req, res) => {
    try {
        const { enabled } = req.body;
        const instance = instanceService.toggleMCP(req.params.id, enabled);
        res.json(instance);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// System status check
app.get('/api/system/status', async (req, res) => {
    try {
        const systemStatus = await systemCheckerService.checkAll();
        res.json(systemStatus);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (req.path.startsWith('/api')) {
        res.status(500).json({ error: err.message });
    } else {
        res.status(500).render('error', { error: err.message });
    }
});

// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Endpoint not found' });
    } else {
        res.status(404).render('error', { error: 'Page not found' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  DirectusCloud - Multi-Instance Hosting Platform v2.0    ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  ✓ Mode: ${NODE_ENV.toUpperCase()}`);
    console.log(`  ✓ Server: http://localhost:${PORT}`);
    console.log(`  ✓ API: http://localhost:${PORT}/api`);
    console.log('');
    console.log(`  Instances Directory: ${process.env.INSTANCES_DIR || './instances'}`);
    console.log(`  Starting Port: ${process.env.STARTING_PORT}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Closing server...');
    process.exit(0);
});

export default app;
