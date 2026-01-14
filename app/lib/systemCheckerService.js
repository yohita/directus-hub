import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SystemCheckerService {
    async checkCaddy() {
        try {
            // Check if Caddy is installed
            const { stdout: version } = await execAsync('caddy version', { timeout: 5000 });
            const isInstalled = version.includes('v');

            // Check if Caddy is running
            let isRunning = false;
            try {
                const { stdout } = await execAsync('pgrep -x caddy', { timeout: 5000 });
                isRunning = stdout.trim().length > 0;
            } catch (error) {
                // pgrep returns non-zero exit code if process not found
                isRunning = false;
            }

            return {
                name: 'Caddy Server',
                installed: isInstalled,
                running: isRunning,
                version: version.trim(),
                fixCommand: !isInstalled ? 'brew install caddy' : !isRunning ? 'caddy start' : null,
                fixHelp: !isInstalled
                    ? 'Install Caddy using Homebrew: brew install caddy'
                    : !isRunning
                        ? 'Start Caddy server: caddy start --config Caddyfile'
                        : null
            };
        } catch (error) {
            return {
                name: 'Caddy Server',
                installed: false,
                running: false,
                version: null,
                fixCommand: 'brew install caddy',
                fixHelp: 'Install Caddy using Homebrew: brew install caddy'
            };
        }
    }

    async checkPM2() {
        try {
            const { stdout: version } = await execAsync('pm2 --version', { timeout: 5000 });
            const isInstalled = version.trim().length > 0;

            // Check if PM2 daemon is running
            let isRunning = false;
            try {
                const { stdout } = await execAsync('pm2 ping', { timeout: 5000 });
                isRunning = stdout.includes('pong');
            } catch (error) {
                isRunning = false;
            }

            return {
                name: 'PM2',
                installed: isInstalled,
                running: isRunning,
                version: version.trim(),
                fixCommand: !isInstalled ? 'npm install -g pm2' : null,
                fixHelp: !isInstalled
                    ? 'Install PM2 globally: npm install -g pm2'
                    : !isRunning
                        ? 'PM2 daemon will start automatically when needed'
                        : null
            };
        } catch (error) {
            return {
                name: 'PM2',
                installed: false,
                running: false,
                version: null,
                fixCommand: 'npm install -g pm2',
                fixHelp: 'Install PM2 globally: npm install -g pm2'
            };
        }
    }

    async checkNode() {
        try {
            const { stdout: version } = await execAsync('node --version', { timeout: 5000 });
            const versionNumber = version.trim();
            const majorVersion = parseInt(versionNumber.replace('v', '').split('.')[0]);
            const isCompatible = majorVersion >= 18;

            return {
                name: 'Node.js',
                installed: true,
                running: true,
                version: versionNumber,
                compatible: isCompatible,
                fixCommand: !isCompatible ? 'brew install node@20' : null,
                fixHelp: !isCompatible
                    ? `Current version ${versionNumber} is too old. Install Node.js 18+ using: brew install node@20`
                    : null
            };
        } catch (error) {
            return {
                name: 'Node.js',
                installed: false,
                running: false,
                version: null,
                compatible: false,
                fixCommand: 'brew install node',
                fixHelp: 'Install Node.js using Homebrew: brew install node'
            };
        }
    }

    async checkAll() {
        const [caddy, pm2, node] = await Promise.all([
            this.checkCaddy(),
            this.checkPM2(),
            this.checkNode()
        ]);

        const checks = [node, pm2, caddy];
        const allOk = checks.every(check =>
            check.installed && (check.compatible === undefined || check.compatible)
        );

        return {
            checks,
            allOk,
            timestamp: new Date().toISOString()
        };
    }
}

export default new SystemCheckerService();
