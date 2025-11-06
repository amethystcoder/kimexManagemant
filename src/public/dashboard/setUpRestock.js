window.addEventListener("DOMContentLoaded",async ()=>{
    try {
        const restockTableBody =  document.getElementById("restockTableBody");
        const response = await fetch('/api/restock');
        if (!response.ok) {
            alert("an error occured getting the required data")
        }
        const data = await response.json();
        let tabulatedData = ''
        if (!data || data.length == 0) {
            tabulatedData = "no restocks yet"
        }
        data.forEach((item)=>{
            tabulatedData += `
            <tr class="border-t border-t-[#dfe3dd]">
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-120 h-[72px] px-4 py-2 w-[400px] text-[#6f816a] text-sm font-normal leading-normal">${item.id}</td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-240 h-[72px] px-4 py-2 w-[400px] text-[#131612] text-sm font-normal leading-normal">
                ${item.productName}
                </td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-360 h-[72px] px-4 py-2 w-[400px] text-[#6f816a] text-sm font-normal leading-normal">
                ${item.productType}
                </td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-480 h-[72px] px-4 py-2 w-[400px] text-[#6f816a] text-sm font-normal leading-normal">${item.quantity}</td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-600 h-[72px] px-4 py-2 w-[400px] text-[#6f816a] text-sm font-normal leading-normal">
                ${item.restockDate}
                </td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-720 h-[72px] px-4 py-2 w-[400px] text-[#6f816a] text-sm font-normal leading-normal">${item.restockTime}</td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-840 h-[72px] px-4 py-2 w-[400px] text-[#6f816a] text-sm font-normal leading-normal">
                ${item.expiryDate}
                </td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-960 h-[72px] px-4 py-2 w-[400px] text-[#6f816a] text-sm font-normal leading-normal">${item.restockBy}</td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-1080 h-[72px] px-4 py-2 w-60 text-sm font-normal leading-normal">
                <button
                    class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-8 px-4 bg-[#f2f4f1] text-[#131612] text-sm font-medium leading-normal w-full"
                >
                    <span class="truncate">${item.status}</span>
                </button>
                </td>
                <td class="table-a412e2dc-927c-4cde-9278-e7c4b3efa616-column-1200 h-[72px] px-4 py-2 w-[400px] text-[#6f816a] text-sm font-normal leading-normal">${item.remarks}</td>
            </tr>`
        })
        restockTableBody.innerHTML = tabulatedData
    } catch (error) {
        alert("an error occured. Please try again later "+ error)
    }
})