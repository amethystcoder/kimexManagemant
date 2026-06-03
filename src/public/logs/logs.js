const statusEl = document.getElementById('status');
const tableBody = document.querySelector('#logTable tbody');
const refreshButton = document.getElementById('refreshLogs');

const formatDetails = (details) => {
  if (!details) return '';
  if (typeof details === 'string') return details;
  return JSON.stringify(details);
};

const loadLogs = async () => {
  try {
    const response = await fetch('/api/logs');
    if (!response.ok) {
      throw new Error('Unable to fetch logs');
    }
    const logs = await response.json();
    tableBody.innerHTML = logs
      .map((log) => `
        <tr>
          <td>${new Date(log.created_at || log.timestamp).toLocaleString()}</td>
          <td>${log.username || 'system'}</td>
          <td>${log.action}</td>
          <td>${log.module}</td>
          <td>${formatDetails(log.details)}</td>
        </tr>
      `)
      .join('');
    statusEl.textContent = `Loaded ${logs.length} log entries.`;
  } catch (error) {
    statusEl.textContent = error.message || 'Failed to load logs.';
  }
};

window.addEventListener('DOMContentLoaded', () => {
  loadLogs();
  refreshButton?.addEventListener('click', loadLogs);
});
