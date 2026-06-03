let stockList = [];

const renderStockList = () => {
  const stockListElement = document.querySelector('#stock-list');
  if (!stockListElement) return;

  if (stockList.length === 0) {
    stockListElement.innerHTML = '<li class="stock-item text-sm text-[#6f816a]">No items added yet.</li>';
    return;
  }

  stockListElement.innerHTML = stockList
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
      const index = Number(target.getAttribute('data-index'));
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
  const form = document.querySelector('#restockForm');
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
});

window.closeRestockForm = () => {
  const restockForm = document.querySelector('#restockForm');
  const overlay = document.querySelector('.overlay-div');
  if (restockForm) restockForm.reset();
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.classList.add('inactive');
};

window.showRestock = () => {
  const restockForm = document.querySelector('#restockForm');
  const overlay = document.querySelector('.overlay-div');
  if (restockForm) restockForm.reset();
  if (!overlay) return;
  overlay.classList.remove('inactive');
  overlay.classList.add('active');
};