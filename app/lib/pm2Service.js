import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import instanceService from './instanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
// PM2_HOME is in project root: data/.pm2
const PM2_HOME = process.env.PM2_HOME || path.join(path.dirname(path.dirname(__dirname)), 'data', '.pm2');

class PM2Service {
    constructor() {
        this.pm2Cmd = `PM2_HOME=${PM2_HOME} npx pm2`;
    }

    async startInstance(id) {
        const instance = instanceService.getInstanceById(id);
        if (!instance) {
            throw new Error('Instance not found');
        }

        const instanceDir = instanceService.getInstancePath(id);
        const appName = `directus-${instance.subdomain}`;

        try {
            // Check if already running
            const list = await this.execPM2('list');
            if (list.includes(appName)) {
                // Restart if already exists
                await this.execPM2(`restart ${appName}`);
            } else {
                // Start new process
                await this.execPM2(
                    `start npx --name ${appName} --cwd ${instanceDir} -- directus start`,
                    instanceDir
                );
            }

            // Update status in database
            instanceService.updateInstance(id, { status: 'running' });

            return { success: true, message: 'Instance started successfully' };
        } catch (error) {
            console.error('PM2 start error:', error);
            throw new Error(`Failed to start instance: ${error.message}`);
        }
    }

    async stopInstance(id) {
        const instance = instanceService.getInstanceById(id);
        if (!instance) {
            throw new Error('Instance not found');
        }

        const appName = `directus-${instance.subdomain}`;

        try {
            await this.execPM2(`stop ${appName}`);
            await this.execPM2(`delete ${appName}`);

            // Update status in database
            instanceService.updateInstance(id, { status: 'stopped' });

            return { success: true, message: 'Instance stopped successfully' };
        } catch (error) {
            console.error('PM2 stop error:', error);
            throw new Error(`Failed to stop instance: ${error.message}`);
        }
    }

    async restartInstance(id) {
        const instance = instanceService.getInstanceById(id);
        if (!instance) {
            throw new Error('Instance not found');
        }

        const appName = `directus-${instance.subdomain}`;

        try {
            await this.execPM2(`restart ${appName}`);

            // Update status in database
            instanceService.updateInstance(id, { status: 'running' });

            return { success: true, message: 'Instance restarted successfully' };
        } catch (error) {
            console.error('PM2 restart error:', error);
            throw new Error(`Failed to restart instance: ${error.message}`);
        }
    }

    async getInstanceStatus(id) {
        const instance = instanceService.getInstanceById(id);
        if (!instance) {
            throw new Error('Instance not found');
        }

        const appName = `directus-${instance.subdomain}`;

        try {
            const output = await this.execPM2(`describe ${appName}`);
            return output;
        } catch (error) {
            return null;
        }
    }

    async getInstanceLogs(id, lines = 50) {
        const instance = instanceService.getInstanceById(id);
        if (!instance) {
            throw new Error('Instance not found');
        }

        const appName = `directus-${instance.subdomain}`;

        try {
            const output = await this.execPM2(`logs ${appName} --lines ${lines} --nostream`);
            return output;
        } catch (error) {
            return '';
        }
    }

    async listAll() {
        try {
            const output = await this.execPM2('list');
            return output;
        } catch (error) {
            return '';
        }
    }

    async execPM2(command, cwd = process.cwd()) {
        const fullCommand = `${this.pm2Cmd} ${command}`;
        const { stdout, stderr } = await execAsync(fullCommand, { cwd });
        if (stderr) console.error('PM2 stderr:', stderr);
        return stdout;
    }
}

export default new PM2Service();
