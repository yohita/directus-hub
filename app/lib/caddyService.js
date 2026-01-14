import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import instanceService from './instanceService.js';

const execAsync = promisify(exec);
const INSTANCES_DIR = process.env.INSTANCES_DIR || path.join(process.cwd(), 'instances');
const DIRECTUS_CLOUD_DIR = process.env.DIRECTUS_CLOUD_DIR || path.join(process.env.HOME, 'directus-cloud');

class CaddyService {
    constructor() {
        this.caddyfilePath = path.join(DIRECTUS_CLOUD_DIR, 'Caddyfile');
        this.httpPort = process.env.CADDY_HTTP_PORT || '8080';
        this.httpsPort = process.env.CADDY_HTTPS_PORT || '8443';
    }

    async generateCaddyfile() {
        const instances = instanceService.getAllInstances();

        let caddyConfig = `# DirectusCloud - Auto-generated Caddyfile
# Generated at: ${new Date().toISOString()}

{
  http_port ${this.httpPort}
  https_port ${this.httpsPort}
  auto_https off
}

`;

        instances.forEach(instance => {
            // Local subdomain
            caddyConfig += `
# Instance: ${instance.name} (Local)
${instance.subdomain}.localhost:${this.httpPort} {
  reverse_proxy localhost:${instance.port}
}
`;

            // Custom domain (if exists)
            if (instance.custom_domain) {
                caddyConfig += `
# Instance: ${instance.name} (Custom Domain)
${instance.custom_domain} {
  reverse_proxy localhost:${instance.port}
}
`;
            }
        });

        fs.writeFileSync(this.caddyfilePath, caddyConfig);
        console.log(`✓ Caddyfile generated at ${this.caddyfilePath}`);

        return this.caddyfilePath;
    }

    async reloadCaddy() {
        try {
            // Check if Caddy is installed
            await execAsync('which caddy');

            // Reload Caddy configuration
            await execAsync(`caddy reload --config ${this.caddyfilePath}`);
            console.log('✓ Caddy configuration reloaded');

            return { success: true, message: 'Caddy reloaded successfully' };
        } catch (error) {
            if (error.message.includes('which caddy')) {
                console.warn('⚠ Caddy not found. Install Caddy for reverse proxy support.');
                return {
                    success: false,
                    message: 'Caddy not installed',
                    installInstructions: 'Visit https://caddyserver.com/docs/install for installation instructions'
                };
            }
            throw new Error(`Failed to reload Caddy: ${error.message}`);
        }
    }

    async startCaddy() {
        try {
            await execAsync('which caddy');

            // Start Caddy in background
            const { stdout } = await execAsync(`caddy start --config ${this.caddyfilePath}`);
            console.log('✓ Caddy started');

            return { success: true, message: 'Caddy started successfully' };
        } catch (error) {
            if (error.message.includes('which caddy')) {
                return {
                    success: false,
                    message: 'Caddy not installed',
                    installInstructions: 'Visit https://caddyserver.com/docs/install for installation instructions'
                };
            }
            throw new Error(`Failed to start Caddy: ${error.message}`);
        }
    }

    async stopCaddy() {
        try {
            await execAsync('caddy stop');
            console.log('✓ Caddy stopped');

            return { success: true, message: 'Caddy stopped successfully' };
        } catch (error) {
            throw new Error(`Failed to stop Caddy: ${error.message}`);
        }
    }

    async checkCaddyStatus() {
        try {
            const { stdout } = await execAsync('which caddy');
            const isInstalled = !!stdout.trim();

            if (isInstalled) {
                // Try to check if Caddy is running
                try {
                    await execAsync('pgrep caddy');
                    return { installed: true, running: true };
                } catch {
                    return { installed: true, running: false };
                }
            }

            return { installed: false, running: false };
        } catch (error) {
            return { installed: false, running: false };
        }
    }
}

export default new CaddyService();
