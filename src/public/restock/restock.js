let stockList = [];

const submitRestock = async (event) => {
    const data = {
        restockList:stockList.map(item => {return {...item,restockBy:localStorage.getItem("username"),status:"Restock"}}),
    };
    console.log(data)
    try {
        const response = await fetch('/api/restock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            alert('Restock successful!');
            window.location.href = '/dashboard/dashboard.html'; // Redirect to dashboard on success
        } else {
            alert(result.message || 'Restock failed. Please try again.');
        }
    } catch (error) {
        console.error('Restock failed:', error);
        alert('Restock failed. Please try again.');
    }
}


window.addEventListener("DOMContentLoaded",(ev) =>{
    document.querySelector('#restockForm').addEventListener('submit', (event) => {
        event.preventDefault();
    
        const formData = new FormData(event.target);
        const item = Object.fromEntries(formData.entries());
        item.quantity = parseInt(item.quantity);
    
        // Check if item is already in stockList based on productName & type
        const isDuplicate = stockList.some(existing =>
            existing.productName === item.productName &&
            existing.productType === item.productType
        );
    
        if (!isDuplicate) {
            stockList.push(item);
    
            const stockListElement = document.querySelector('.contains-stock');
            const listItem = document.createElement('li');
            listItem.classList.add('stock-item');
            listItem.innerHTML = `
            <h1>${item.productName}</h1> <button onclick="removeFromStockList(${item})">Remove</button>
            `;
            stockListElement.appendChild(listItem);
    
            event.target.reset();
        } else {
            alert('Item already in stock list.');
        }
    });
    
})

const removeFromStockList = (item) => {
    const index = stockList.indexOf(item);
    if (index > -1) {
        stockList.splice(index, 1);
        const stockListElement = document.querySelector('#stock-list');
        const listItems = stockListElement.querySelectorAll('li');
        listItems[index].remove();
    } else {
        alert('Item not found in stock list.');
    }
}

const closeRestockForm = () => {
;    const restockForm = document.querySelector('#restockForm');
    const overlay = document.querySelector('.overlay-div');
    restockForm.reset();
    overlay.classList.remove('active');
    overlay.classList.add('inactive');
}

const showRestock = () => {
    const restockForm = document.querySelector('#restockForm');
    restockForm.reset();
    const overlay = document.querySelector('.overlay-div');
    restockForm.reset();
    overlay.classList.remove('inactive');
    overlay.classList.add('active');
}