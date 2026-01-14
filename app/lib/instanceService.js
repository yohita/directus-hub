import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '../lib/database.js';
import crypto from 'crypto';

const execAsync = promisify(exec);
const INSTANCES_DIR = process.env.INSTANCES_DIR || path.join(process.cwd(), 'instances');

class InstanceService {
    constructor() {
        // Ensure instances directory exists
        if (!fs.existsSync(INSTANCES_DIR)) {
            fs.mkdirSync(INSTANCES_DIR, { recursive: true });
        }
    }

    generateApiKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateRandomKey() {
        return Array.from({ length: 32 }, () =>
            Math.random().toString(36).charAt(2)
        ).join('');
    }

    async createInstanceWithProgress(data, sendProgress) {
        const { name, subdomain, custom_domain, databaseType = 'sqlite', adminEmail, adminPassword } = data;

        if (!name || !subdomain || !adminEmail || !adminPassword) {
            throw new Error('Missing required fields');
        }

        sendProgress('validate', 'Validating input...', 5);

        const existing = db.prepare('SELECT * FROM instances WHERE subdomain = ?').get(subdomain);
        if (existing) {
            throw new Error(`Subdomain '${subdomain}' already in use`);
        }

        if (custom_domain) {
            const existingCustom = db.prepare('SELECT * FROM instances WHERE custom_domain = ?').get(custom_domain);
            if (existingCustom) {
                throw new Error(`Custom domain '${custom_domain}' already in use`);
            }
        }

        sendProgress('prepare', 'Preparing instance...', 10);

        const id = uuidv4();
        const port = await this.findAvailablePort();
        const apiKey = this.generateApiKey();

        const instanceDir = path.join(INSTANCES_DIR, id);
        fs.mkdirSync(instanceDir, { recursive: true });

        try {
            sendProgress('install', 'Installing Directus (this may take a few minutes)...', 20);
            console.log(`Installing Directus for instance ${name}...`);

            // Run npm init and install with progress simulation
            await execAsync(`npm init -y`, { cwd: instanceDir });
            sendProgress('install', 'Initialized package.json...', 30);

            // Install Directus
            await execAsync(`npm install directus`, { cwd: instanceDir });
            sendProgress('install', 'Directus installed successfully!', 60);

            sendProgress('setup', 'Creating directories...', 65);
            const uploadsDir = path.join(instanceDir, 'uploads');
            const extensionsDir = path.join(instanceDir, 'extensions');
            fs.mkdirSync(uploadsDir, { recursive: true });
            fs.mkdirSync(extensionsDir, { recursive: true });

            sendProgress('setup', 'Generating configuration...', 70);
            // Generate .env file
            const envContent = this.generateEnvFile({
                port,
                databaseType,
                adminEmail,
                adminPassword,
                apiKey,
                publicUrl: custom_domain ? `https://${custom_domain}` : `http://${subdomain}.localhost:${process.env.PORT || 3001}`,
                ...data
            });

            fs.writeFileSync(path.join(instanceDir, '.env'), envContent);

            sendProgress('database', 'Saving instance details...', 75);
            // Insert into database
            const stmt = db.prepare(`
        INSERT INTO instances (
          id, name, subdomain, port, custom_domain, database_type, 
          database_host, database_port, database_name, 
          database_user, database_password,
          admin_email, admin_password, api_key, mcp_enabled, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            stmt.run(
                id, name, subdomain, port, custom_domain || null, databaseType,
                data.databaseHost || null,
                data.databasePort || null,
                data.databaseName || null,
                data.databaseUser || null,
                data.databasePassword || null,
                adminEmail,
                adminPassword,
                apiKey,
                0, // mcp_enabled default to false
                'stopped'
            );

            // Bootstrap Directus
            sendProgress('bootstrap', 'Bootstrapping Directus...', 85);
            console.log(`Bootstrapping Directus instance ${name}...`);
            try {
                await execAsync(`npx directus bootstrap`, {
                    cwd: instanceDir,
                    env: { ...process.env, ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword }
                });
                sendProgress('bootstrap', 'Bootstrap complete!', 95);
            } catch (bootstrapError) {
                console.warn('Bootstrap warning:', bootstrapError.message);
                sendProgress('bootstrap', 'Bootstrap completed with warnings', 95);
            }

            return this.getInstanceById(id);
        } catch (error) {
            if (fs.existsSync(instanceDir)) {
                fs.rmSync(instanceDir, { recursive: true, force: true });
            }
            db.prepare('DELETE FROM instances WHERE id = ?').run(id);
            throw error;
        }
    }

    async findAvailablePort() {
        const startingPort = parseInt(process.env.STARTING_PORT) || 8910;
        const usedPorts = db.prepare('SELECT port FROM instances').all().map(r => r.port);

        let port = startingPort;
        while (usedPorts.includes(port)) {
            port++;
        }

        return port;
    }

    generateEnvFile(config) {
        const { port, databaseType, adminEmail, adminPassword, apiKey } = config;

        let dbConfig = '';
        if (databaseType === 'sqlite') {
            dbConfig = `DB_CLIENT="sqlite3"
DB_FILENAME="./data.db"`;
        } else if (databaseType === 'postgres') {
            dbConfig = `DB_CLIENT="pg"
DB_HOST="${config.databaseHost}"
DB_PORT="${config.databasePort}"
DB_DATABASE="${config.databaseName}"
DB_USER="${config.databaseUser}"
DB_PASSWORD="${config.databasePassword}"`;
        } else if (databaseType === 'mysql') {
            dbConfig = `DB_CLIENT="mysql"
DB_HOST="${config.databaseHost}"
DB_PORT="${config.databasePort}"
DB_DATABASE="${config.databaseName}"
DB_USER="${config.databaseUser}"
DB_PASSWORD="${config.databasePassword}"`;
        }

        let storageConfig = '';
        if (config.storageAdapter === 's3') {
            storageConfig = `STORAGE_LOCATIONS="s3"
STORAGE_S3_DRIVER="s3"
STORAGE_S3_KEY="${config.s3Key}"
STORAGE_S3_SECRET="${config.s3Secret}"
STORAGE_S3_BUCKET="${config.s3Bucket}"
STORAGE_S3_REGION="${config.s3Region}"
${config.s3Endpoint ? `STORAGE_S3_ENDPOINT="${config.s3Endpoint}"` : ''}`;
        } else {
            storageConfig = `STORAGE_LOCATIONS="local"
STORAGE_LOCAL_DRIVER="local"
STORAGE_LOCAL_ROOT="./uploads"`;
        }

        return `####################################################################################################
## General

KEY="${this.generateRandomKey()}"
SECRET="${this.generateRandomKey()}"

####################################################################################################
## Database

${dbConfig}

####################################################################################################
## Security

ADMIN_EMAIL="${adminEmail}"
ADMIN_PASSWORD="${adminPassword}"

####################################################################################################
## API

PUBLIC_URL="${config.publicUrl || `http://localhost:${port}`}"
API_KEY="${apiKey}"

####################################################################################################
## Server

PORT=${port}

####################################################################################################
## Storage

${storageConfig}

####################################################################################################
## File Uploads

MAX_PAYLOAD_SIZE="100mb"
`;
    }

    getAllInstances() {
        return db.prepare('SELECT * FROM instances ORDER BY created_at DESC').all();
    }

    getInstanceById(id) {
        return db.prepare('SELECT * FROM instances WHERE id = ?').get(id);
    }

    updateInstance(id, data) {
        const instance = this.getInstanceById(id);
        if (!instance) {
            throw new Error('Instance not found');
        }

        const updates = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && key !== 'id') {
                updates.push(`${key} = ?`);
                values.push(data[key]);
            }
        });

        if (updates.length === 0) return instance;

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const stmt = db.prepare(`
      UPDATE instances SET ${updates.join(', ')} WHERE id = ?
    `);
        stmt.run(...values);

        return this.getInstanceById(id);
    }

    async deleteInstance(id) {
        const instance = this.getInstanceById(id);
        if (!instance) {
            throw new Error('Instance not found');
        }

        const instanceDir = path.join(INSTANCES_DIR, id);
        if (fs.existsSync(instanceDir)) {
            fs.rmSync(instanceDir, { recursive: true, force: true });
        }

        db.prepare('DELETE FROM instances WHERE id = ?').run(id);

        return { success: true, message: 'Instance deleted successfully' };
    }

    async cloneInstance(sourceId, { name, subdomain }, sendProgress) {
        const sourceInstance = this.getInstanceById(sourceId);
        if (!sourceInstance) {
            throw new Error('Source instance not found');
        }

        sendProgress('validate', 'Validating input...', 5);

        if (!name || !subdomain) {
            throw new Error('Name and subdomain are required');
        }

        const existing = db.prepare('SELECT * FROM instances WHERE subdomain = ?').get(subdomain);
        if (existing) {
            throw new Error(`Subdomain '${subdomain}' already in use`);
        }

        sendProgress('prepare', 'Preparing to clone instance...', 10);

        const newId = uuidv4();
        const newPort = await this.findAvailablePort();
        const newApiKey = this.generateApiKey();

        const sourceDir = path.join(INSTANCES_DIR, sourceId);
        const targetDir = path.join(INSTANCES_DIR, newId);

        try {
            sendProgress('copy', 'Copying instance files...', 20);

            // Copy entire directory structure
            fs.mkdirSync(targetDir, { recursive: true });

            // Copy node_modules if it exists
            if (fs.existsSync(path.join(sourceDir, 'node_modules'))) {
                sendProgress('copy', 'Copying node_modules (this may take a while)...', 25);
                await execAsync(`cp -R "${path.join(sourceDir, 'node_modules')}" "${targetDir}/"}`);
            }

            sendProgress('copy', 'Copying uploads and extensions...', 50);

            // Copy uploads directory
            if (fs.existsSync(path.join(sourceDir, 'uploads'))) {
                await execAsync(`cp -R "${path.join(sourceDir, 'uploads')}" "${targetDir}/"`);
            } else {
                fs.mkdirSync(path.join(targetDir, 'uploads'), { recursive: true });
            }

            // Copy extensions directory
            if (fs.existsSync(path.join(sourceDir, 'extensions'))) {
                await execAsync(`cp -R "${path.join(sourceDir, 'extensions')}" "${targetDir}/"`);
            } else {
                fs.mkdirSync(path.join(targetDir, 'extensions'), { recursive: true });
            }

            // Copy package.json
            if (fs.existsSync(path.join(sourceDir, 'package.json'))) {
                fs.copyFileSync(
                    path.join(sourceDir, 'package.json'),
                    path.join(targetDir, 'package.json')
                );
            }

            sendProgress('copy', 'Copying database...', 65);

            // Copy database file if SQLite
            if (sourceInstance.database_type === 'sqlite') {
                const sourceDbPath = path.join(sourceDir, 'data.db');
                if (fs.existsSync(sourceDbPath)) {
                    fs.copyFileSync(sourceDbPath, path.join(targetDir, 'data.db'));
                }
            }

            sendProgress('config', 'Generating new configuration...', 75);

            // Generate new .env file with updated port and credentials
            const envContent = this.generateEnvFile({
                port: newPort,
                databaseType: sourceInstance.database_type,
                adminEmail: sourceInstance.admin_email,
                adminPassword: sourceInstance.admin_password,
                apiKey: newApiKey,
                databaseHost: sourceInstance.database_host,
                databasePort: sourceInstance.database_port,
                databaseName: sourceInstance.database_name,
                databaseUser: sourceInstance.database_user,
                databasePassword: sourceInstance.database_password
            });

            fs.writeFileSync(path.join(targetDir, '.env'), envContent);

            sendProgress('database', 'Saving clone details...', 85);

            // Insert into database
            const stmt = db.prepare(`
                INSERT INTO instances (
                    id, name, subdomain, port, database_type,
                    database_host, database_port, database_name,
                    database_user, database_password,
                    admin_email, admin_password, api_key, mcp_enabled, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                newId, name, subdomain, newPort, sourceInstance.database_type,
                sourceInstance.database_host,
                sourceInstance.database_port,
                sourceInstance.database_name,
                sourceInstance.database_user,
                sourceInstance.database_password,
                sourceInstance.admin_email,
                sourceInstance.admin_password,
                newApiKey,
                sourceInstance.mcp_enabled,
                'stopped'
            );

            sendProgress('complete', 'Clone created successfully!', 95);

            return this.getInstanceById(newId);
        } catch (error) {
            // Cleanup on error
            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
            }
            db.prepare('DELETE FROM instances WHERE id = ?').run(newId);
            throw error;
        }
    }

    getInstancePath(id) {
        return path.join(INSTANCES_DIR, id);
    }

    toggleMCP(id, enabled) {
        const instance = this.getInstanceById(id);
        if (!instance) {
            throw new Error('Instance not found');
        }

        db.prepare('UPDATE instances SET mcp_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(enabled ? 1 : 0, id);

        return this.getInstanceById(id);
    }
}

export default new InstanceService();
