// Utility functions
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        alert(error.message);
        throw error;
    }
}

// Modal functions
function openCreateModal() {
    document.getElementById('createModal').classList.add('active');
}

function closeCreateModal() {
    document.getElementById('createModal').classList.remove('active');
    document.getElementById('createForm').reset();
    document.getElementById('s3Fields').style.display = 'none';
}

function toggleStorageFields() {
    const adapter = document.getElementById('storageAdapterSelect').value;
    const s3Fields = document.getElementById('s3Fields');

    if (adapter === 's3') {
        s3Fields.style.display = 'block';
        // Add 'required' attribute to inputs when S3 is selected
        s3Fields.querySelectorAll('input').forEach(input => {
            if (input.name !== 's3Endpoint') input.required = true;
        });
    } else {
        s3Fields.style.display = 'none';
        // Remove 'required' attribute when not selected
        s3Fields.querySelectorAll('input').forEach(input => input.required = false);
    }
}

function openCloneModal(sourceId, sourceName) {
    document.getElementById('cloneModal').classList.add('active');
    document.getElementById('cloneSourceId').value = sourceId;
    document.getElementById('cloneName').value = `${sourceName} - Copy`;
    document.getElementById('cloneSubdomain').value = '';
}

function closeCloneModal() {
    document.getElementById('cloneModal').classList.remove('active');
    document.getElementById('cloneForm').reset();
}

function openProgressModal(title = 'Creating Instance...') {
    const modal = document.getElementById('progressModal');
    document.getElementById('progressTitle').textContent = title;
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressPercentage').textContent = '0%';
    document.getElementById('progressMessage').textContent = 'Initializing...';

    // Reset all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'complete');
    });

    modal.classList.add('active');
}

function updateProgress(step, message, progress) {
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressPercentage').textContent = `${progress}%`;
    document.getElementById('progressMessage').textContent = message;

    // Update step indicators
    const allSteps = document.querySelectorAll('.step');
    allSteps.forEach(stepEl => {
        stepEl.classList.remove('active');
        const stepName = stepEl.dataset.step;
        if (stepName === step) {
            stepEl.classList.add('active');
        }
    });

    // Mark previous steps as complete
    let foundCurrent = false;
    allSteps.forEach(stepEl => {
        if (stepEl.dataset.step === step) {
            foundCurrent = true;
        } else if (!foundCurrent) {
            stepEl.classList.add('complete');
        }
    });
}

function closeProgressModal() {
    document.getElementById('progressModal').classList.remove('active');
}

// Password toggle
function togglePassword(button) {
    const passwordField = button.closest('.password');
    const hidden = passwordField.querySelector('.password-hidden');
    const revealed = passwordField.querySelector('.password-revealed');

    if (hidden.style.display === 'none') {
        hidden.style.display = '';
        revealed.style.display = 'none';
    } else {
        hidden.style.display = 'none';
        revealed.style.display = '';
    }
}

// Instance management functions
async function createInstance(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    closeCreateModal();
    openProgressModal('Creating Instance...');

    try {
        // Use EventSource for Server-Sent Events
        const eventSource = new EventSource(`/api/instances/create?${new URLSearchParams(data)}`);

        // Convert to POST using fetch
        const response = await fetch('/api/instances/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));

                    if (data.step === 'error') {
                        closeProgressModal();
                        alert(`Error: ${data.message}`);
                        return;
                    }

                    if (data.step === 'complete') {
                        updateProgress('complete', data.message, 100);
                        setTimeout(() => {
                            closeProgressModal();
                            window.location.reload();
                        }, 1500);
                        return;
                    }

                    updateProgress(data.step, data.message, data.progress);
                }
            }
        }
    } catch (error) {
        closeProgressModal();
        alert(`Error: ${error.message}`);
    }
}

async function cloneInstance(sourceId, sourceName) {
    openCloneModal(sourceId, sourceName);
}

async function submitClone(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const sourceId = formData.get('sourceId');
    const data = {
        name: formData.get('name'),
        subdomain: formData.get('subdomain')
    };

    closeCloneModal();
    openProgressModal('Cloning Instance...');

    try {
        const response = await fetch(`/api/instances/${sourceId}/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));

                    if (data.step === 'error') {
                        closeProgressModal();
                        alert(`Error: ${data.message}`);
                        return;
                    }

                    if (data.step === 'complete') {
                        updateProgress('complete', data.message, 100);
                        setTimeout(() => {
                            closeProgressModal();
                            window.location.reload();
                        }, 1500);
                        return;
                    }

                    updateProgress(data.step, data.message, data.progress);
                }
            }
        }
    } catch (error) {
        closeProgressModal();
        alert(`Error: ${error.message}`);
    }
}

async function startInstance(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    card.style.opacity = '0.7';
    card.style.pointerEvents = 'none';

    try {
        await apiCall(`/api/instances/${id}/start`, {
            method: 'POST'
        });

        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        window.location.reload();
    }
}

async function stopInstance(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    card.style.opacity = '0.7';
    card.style.pointerEvents = 'none';

    try {
        await apiCall(`/api/instances/${id}/stop`, {
            method: 'POST'
        });

        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        window.location.reload();
    }
}

async function restartInstance(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    card.style.opacity = '0.7';
    card.style.pointerEvents = 'none';

    try {
        await apiCall(`/api/instances/${id}/restart`, {
            method: 'POST'
        });

        setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
        window.location.reload();
    }
}

async function deleteInstance(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        return;
    }

    const card = document.querySelector(`[data-id="${id}"]`);
    card.style.opacity = '0.5';

    try {
        await apiCall(`/api/instances/${id}`, {
            method: 'DELETE'
        });

        window.location.reload();
    } catch (error) {
        card.style.opacity = '1';
    }
}

async function toggleMCP(id, enabled) {
    try {
        await apiCall(`/api/instances/${id}/mcp`, {
            method: 'POST',
            body: JSON.stringify({ enabled })
        });

        // Show success message
        const card = document.querySelector(`[data-id="${id}"]`);
        const originalBorder = card.style.borderColor;
        card.style.borderColor = enabled ? '#10b981' : '#6b7280';

        setTimeout(() => {
            card.style.borderColor = originalBorder;
        }, 1000);
    } catch (error) {
        // Revert checkbox on error
        const checkbox = document.querySelector(`[data-id="${id}"] input[type="checkbox"]`);
        checkbox.checked = !enabled;
    }
}

// Instance menu functions
function toggleInstanceMenu(id) {
    // Close other open menus
    document.querySelectorAll('.instance-menu-dropdown.active').forEach(menu => {
        if (menu.id !== `menu-${id}`) {
            menu.classList.remove('active');
            // Also remove active state from trigger
            const trigger = menu.previousElementSibling;
            if (trigger) trigger.classList.remove('active');
        }
    });

    const menu = document.getElementById(`menu-${id}`);
    const trigger = menu.previousElementSibling;

    // Toggle current menu
    menu.classList.toggle('active');
    trigger.classList.toggle('active');
}

// Auto-generate subdomain from name
document.addEventListener('DOMContentLoaded', () => {
    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.instance-menu-container')) {
            document.querySelectorAll('.instance-menu-dropdown.active').forEach(menu => {
                menu.classList.remove('active');
                const trigger = menu.previousElementSibling;
                if (trigger) trigger.classList.remove('active');
            });
        }
    });

    const nameInput = document.querySelector('input[name="name"]');
    const subdomainInput = document.querySelector('input[name="subdomain"]');

    if (nameInput && subdomainInput) {
        nameInput.addEventListener('input', (e) => {
            if (!subdomainInput.value || subdomainInput.dataset.autoGenerated) {
                const subdomain = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');

                subdomainInput.value = subdomain;
                subdomainInput.dataset.autoGenerated = 'true';
            }
        });

        subdomainInput.addEventListener('input', () => {
            delete subdomainInput.dataset.autoGenerated;
        });
    }

    // Close modal on outside click
    document.getElementById('createModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'createModal') {
            closeCreateModal();
        }
    });
});
