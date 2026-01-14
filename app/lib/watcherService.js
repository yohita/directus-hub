import chokidar from 'chokidar';
import path from 'path';
import instanceService from './instanceService.js';
import pm2Service from './pm2Service.js';

class WatcherService {
    constructor() {
        this.watchers = new Map();
    }

    startWatching(instanceId) {
        // Stop existing watcher if any
        this.stopWatching(instanceId);

        const instance = instanceService.getInstanceById(instanceId);
        if (!instance) {
            throw new Error('Instance not found');
        }

        if (!instance.auto_reload) {
            console.log(`Auto-reload disabled for instance ${instance.name}`);
            return;
        }

        const instanceDir = instanceService.getInstancePath(instanceId);
        const extensionsDir = path.join(instanceDir, 'extensions');

        console.log(`Starting file watcher for instance ${instance.name}`);

        const watcher = chokidar.watch(extensionsDir, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true
        });

        watcher
            .on('add', filepath => this.handleFileChange(instanceId, 'added', filepath))
            .on('change', filepath => this.handleFileChange(instanceId, 'changed', filepath))
            .on('unlink', filepath => this.handleFileChange(instanceId, 'removed', filepath));

        this.watchers.set(instanceId, watcher);
    }

    async handleFileChange(instanceId, event, filepath) {
        const instance = instanceService.getInstanceById(instanceId);
        console.log(`[${instance.name}] Extension ${event}: ${path.basename(filepath)}`);

        // Debounce restart - wait 1 second for multiple changes
        if (this.restartTimers?.has(instanceId)) {
            clearTimeout(this.restartTimers.get(instanceId));
        }

        if (!this.restartTimers) {
            this.restartTimers = new Map();
        }

        const timer = setTimeout(async () => {
            try {
                console.log(`[${instance.name}] Restarting due to extension changes...`);
                await pm2Service.restartInstance(instanceId);
                console.log(`[${instance.name}] Restart completed`);
            } catch (error) {
                console.error(`[${instance.name}] Restart failed:`, error.message);
            }
        }, 1000);

        this.restartTimers.set(instanceId, timer);
    }

    stopWatching(instanceId) {
        const watcher = this.watchers.get(instanceId);
        if (watcher) {
            watcher.close();
            this.watchers.delete(instanceId);

            if (this.restartTimers?.has(instanceId)) {
                clearTimeout(this.restartTimers.get(instanceId));
                this.restartTimers.delete(instanceId);
            }

            const instance = instanceService.getInstanceById(instanceId);
            if (instance) {
                console.log(`Stopped file watcher for instance ${instance.name}`);
            }
        }
    }

    stopAll() {
        this.watchers.forEach((watcher, instanceId) => {
            this.stopWatching(instanceId);
        });
    }

    isWatching(instanceId) {
        return this.watchers.has(instanceId);
    }

    getActiveWatchers() {
        return Array.from(this.watchers.keys()).map(id => {
            const instance = instanceService.getInstanceById(id);
            return {
                instanceId: id,
                instanceName: instance?.name,
                active: true
            };
        });
    }
}

export default new WatcherService();
