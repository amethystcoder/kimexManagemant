const buildModuleCards = (modules) => {
  const container = document.getElementById('moduleCards');
  if (!container) return;

  if (!modules || modules.length === 0) {
    container.innerHTML = '<div class="rounded-xl border border-[#dfe3dd] bg-[#f9faf8] p-4 text-sm text-[#6f816a]">No modules available for your account.</div>';
    return;
  }

  container.innerHTML = modules
    .map(
      (module) => `
      <a href="${module.path}" class="block rounded-2xl border border-[#dfe3dd] bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div class="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f816a]">${module.id}</div>
        <div class="text-lg font-semibold text-[#131612]">${module.label}</div>
        <div class="mt-2 text-sm text-[#6f816a]">${module.description}</div>
      </a>`
    )
    .join('');
};

const renderRestockTable = (items) => {
  const body = document.getElementById('restockTableBody');
  if (!body) return;

  if (!items || items.length === 0) {
    body.innerHTML = '<tr><td colspan="10" class="px-4 py-6 text-center text-[#6f816a]">No restock records yet.</td></tr>';
    return;
  }

  body.innerHTML = items
    .map(
      (item) => `
        <tr class="border-t border-t-[#dfe3dd]">
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-120 px-4 py-2 text-[#6f816a] text-sm">${item.id}</td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-240 px-4 py-2 text-[#131612] text-sm">${item.productName}</td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-360 px-4 py-2 text-[#6f816a] text-sm">${item.productType}</td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-480 px-4 py-2 text-[#6f816a] text-sm">${item.quantity}</td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-600 px-4 py-2 text-[#6f816a] text-sm">${new Date(item.restockDate).toLocaleDateString()}</td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-720 px-4 py-2 text-[#6f816a] text-sm">${item.restockTime}</td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-840 px-4 py-2 text-[#6f816a] text-sm">${new Date(item.expiryDate).toLocaleDateString()}</td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-960 px-4 py-2 text-[#6f816a] text-sm">${item.restockBy}</td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-1080 px-4 py-2 text-sm">
            <span class="inline-flex rounded-full bg-[#f2f4f1] px-3 py-1 text-[#131612]">${item.status}</span>
          </td>
          <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-1200 px-4 py-2 text-[#6f816a] text-sm">${item.remarks || ''}</td>
        </tr>`
    )
    .join('');
};

const loadRestockData = async () => {
  try {
    const response = await fetch('/api/restock');
    if (!response.ok) return;
    const data = await response.json();
    renderRestockTable(data);
  } catch (error) {
    console.error('Failed to load restock data:', error);
  }
};

const loadModules = async () => {
  try {
    const response = await fetch('/api/modules');
    if (!response.ok) {
      buildModuleCards([]);
      return;
    }

    const modules = await response.json();
    buildModuleCards(modules);
  } catch (error) {
    console.error('Failed to load modules:', error);
    buildModuleCards([]);
  }
};

let stockList = [];

const renderStockList = () => {
  const listElement = document.getElementById('stock-list');
  if (!listElement) return;

  if (stockList.length === 0) {
    listElement.innerHTML = '<li class="stock-item text-sm text-[#6f816a]">No items added yet.</li>';
    return;
  }

  listElement.innerHTML = stockList
    .map(
      (item, index) => `
        <li class="stock-item flex items-center justify-between gap-4 rounded-xl border border-[#dfe3dd] bg-white p-3 mb-3">
          <div><strong>${item.productName}</strong> · ${item.productType} · ${item.quantity}</div>
          <button type="button" data-index="${index}" class="remove-stock-item rounded-lg bg-[#f2f4f1] px-3 py-1 text-sm text-[#131612]">Remove</button>
        </li>`
    )
    .join('');

  document.querySelectorAll('.remove-stock-item').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget;
      const index = Number(target.dataset.index);
      if (!Number.isNaN(index)) {
        stockList.splice(index, 1);
        renderStockList();
      }
    });
  });
};

window.submitRestock = async () => {
  if (stockList.length === 0) {
    return alert('Add at least one item to restock before submitting.');
  }

  const data = {
    restockList: stockList.map((item) => ({
      ...item,
      restockBy: localStorage.getItem('username') || 'unknown',
      status: 'Restock',
    })),
  };

  try {
    const response = await fetch('/api/restock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.success) {
      alert('Restock successful!');
      window.location.href = '/dashboard/dashboard.html';
    } else {
      alert(result.message || 'Restock failed. Please try again.');
    }
  } catch (error) {
    console.error('Restock failed:', error);
    alert('Restock failed. Please try again.');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('restockForm');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const item = {
        productName: String(formData.get('productName') || '').trim(),
        productType: String(formData.get('productType') || ''),
        quantity: Number(formData.get('quantity') || 0),
        expiryDate: String(formData.get('expiryDate') || ''),
        remarks: String(formData.get('remarks') || '').trim(),
      };

      if (!item.productName || !item.productType || item.quantity <= 0 || !item.expiryDate) {
        return alert('Please complete all required fields before adding the item.');
      }

      const duplicate = stockList.some(
        (existing) => existing.productName === item.productName && existing.productType === item.productType
      );
      if (duplicate) {
        return alert('This item is already in the restock list.');
      }

      stockList.push(item);
      renderStockList();
      form.reset();
    });
  }

  renderStockList();
  loadModules();
  loadRestockData();
});

window.closeRestockForm = () => {
  const overlay = document.querySelector('.overlay-div');
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.classList.add('inactive');
};

window.showRestock = () => {
  const overlay = document.querySelector('.overlay-div');
  if (!overlay) return;
  overlay.classList.remove('inactive');
  overlay.classList.add('active');
};