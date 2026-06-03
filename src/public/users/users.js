const statusEl = document.getElementById('status');
const tableBody = document.querySelector('#usersTable tbody');
const refreshButton = document.getElementById('refreshUsers');

const deleteUser = async (id) => {
  if (!confirm('Deactivate this user account?')) return;
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message || 'Unable to delete user');
    }
    loadUsers();
  } catch (error) {
    alert(error.message || 'Failed to delete user.');
  }
};

const loadUsers = async () => {
  try {
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error('Unable to fetch users');
    }
    const users = await response.json();
    tableBody.innerHTML = users
      .map((user) => `
        <tr>
          <td>${user.username}</td>
          <td>${user.full_name || ''}</td>
          <td>${user.tier}</td>
          <td>${user.is_active ? 'Yes' : 'No'}</td>
          <td><button type="button" data-user-id="${user.id}" class="delete-user">Deactivate</button></td>
        </tr>
      `)
      .join('');

    document.querySelectorAll('.delete-user').forEach((button) => {
      button.addEventListener('click', (event) => {
        const target = event.currentTarget;
        const userId = target.getAttribute('data-user-id');
        if (userId) deleteUser(userId);
      });
    });

    statusEl.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    statusEl.textContent = error.message || 'Failed to load users.';
  }
};

window.addEventListener('DOMContentLoaded', () => {
  loadUsers();
  refreshButton?.addEventListener('click', loadUsers);
});
