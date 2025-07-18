function ensureCustomerList(taxCode) {
    const hkd = ensureHkdData(taxCode);
    if (!hkd.customers) hkd.customers = [];
    return hkd.customers;
}

function splitCustomerTypes(taxCode) {
    const list = hkdData[taxCode].customers || [];
    const normal = list.filter(c => c.type === 'ho_kinh_doanh');
    const guest = list.find(c => c.name.toLowerCase() === 'khách lẻ');
    return [normal, guest];
}

function renderCustomerTab(taxCode) {
  const container = document.getElementById("customerManagerContainer");
  if (!container) return;

  const list = (hkdData[taxCode]?.customers || []).map((c, i) => {
    const total = c.history.reduce((s, h) => s + (h.total || 0), 0);
    const profit = c.history.reduce((s, h) => s + (h.profit || 0), 0);
    return `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone || ''}</td>
        <td>${c.taxCodeInput || ''}</td>
        <td>${c.address || ''}</td>
        <td>${c.type || ''}</td>
        <td>${c.history.length}</td>
        <td>${formatNumber(total)} đ</td>
        <td>${formatNumber(profit)} đ</td>
        <td><button onclick="openCustomerDetailPopup('${taxCode}', ${i})">📜 Chi tiết</button></td>
        <td><button onclick="showCustomerHistory('${taxCode}', hkdData['${taxCode}'].customers[${i}])">📜</button></td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <h3>👥 Danh sách khách hàng (${hkdData[taxCode]?.customers?.length || 0})</h3>
    <table class="table">
      <tr>
        <th>Tên</th><th>SĐT</th><th>MST</th><th>Địa chỉ</th><th>Loại</th>
        <th>SL hóa đơn</th><th>Doanh thu</th><th>Lợi nhuận</th><th colspan=2>Thao tác</th>
      </tr>
      ${list}
    </table>
  `;
}




function togglePaid(taxCode, name, index, value) {
    const customer = ensureCustomerList(taxCode).find(c => c.name === name);
    if (!customer || !customer.history[index]) return;
    customer.history[index].paid = value;
    renderCustomerTab(taxCode);
}

// Gợi ý khách khi nhập tên
function searchCustomerSuggestion(inputValue, taxCode) {
    const suggestionsBox = document.getElementById("customerSuggestions");
    if (!inputValue || !suggestionsBox) return suggestionsBox.innerHTML = "";
    const query = inputValue.toLowerCase();
    const matches = ensureCustomerList(taxCode).filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.taxCode?.includes(query)
    );
    suggestionsBox.innerHTML = matches.map((c, i) =>
        `<div class="suggestion-item" onclick="selectCustomerFromSuggestion(${i}, '${taxCode}')">
      ${c.name} ${c.phone || ''} ${c.taxCode ? '– MST: ' + c.taxCode : ''}
    </div>`
    ).join('');
}

let selectedCustomer = null;

function selectCustomerFromSuggestion(index, taxCode) {
    const list = ensureCustomerList(taxCode);
    const query = document.getElementById("customerNameInput").value.toLowerCase();
    const matches = list.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.taxCode?.includes(query)
    );
    const chosen = matches[index];
    if (!chosen) return;
    selectedCustomer = chosen;
    document.getElementById("customerNameInput").value = chosen.name;
    document.getElementById("customerPhoneInput").value = chosen.phone || '';
    document.getElementById("customerTaxCodeInput").value = chosen.taxCode || '';
    document.getElementById("customerAddressInput").value = chosen.address || '';
    document.getElementById("customerSuggestions").innerHTML = '';
}



function renderExportProductSelector(taxCode) {
    const container = document.getElementById("exportProductTable");
    if (!container) return;

    if (!exportedItems || exportedItems.length === 0) {
        container.innerHTML = `<p><i>Chưa có hàng hóa để xuất</i></p>`;
        return;
    }

    const html = `
    <table class="table">
      <tr><th>Tên</th><th>SL</th><th>Giá gốc</th><th>Thành tiền</th><th>🛠️</th></tr>
      ${exportedItems.map((item, idx) => `
        <tr>
          <td><input value="${item.name}" onchange="exportedItems[${idx}].name=this.value"></td>
          <td><input type="number" value="${item.quantity}" min="1"
              onchange="changeExportQuantity(${idx}, this.value, '${taxCode}')"></td>
          <td><input type="number" value="${item.originalPrice}" onchange="changeExportPrice(${idx}, this.value)"></td>
          <td>${formatNumber(item.amount)} đ</td>
          <td><button onclick="removeExportItem(${idx})">❌</button></td>
        </tr>`).join('')}
    </table>
  `;

    container.innerHTML = html;
}


function changeExportQuantity(index, qty, taxCode) {
    const item = exportedItems[index];
    const stock = (tonkhoMain[taxCode] || []).find(i => i.name === item.name)?.stock || 0;
    qty = Math.max(1, Math.min(parseInt(qty), stock));
    item.quantity = qty;
    const percent = parseFloat(document.getElementById("exportProfitPercent").value || 10);
    item.amount = Math.floor(item.quantity * item.originalPrice * (1 + percent / 100));
    renderExportProductSelector(taxCode);
}

function changeExportPrice(index, price) {
    const item = exportedItems[index];
    item.originalPrice = parseFloat(price);
    const percent = parseFloat(document.getElementById("exportProfitPercent").value || 10);
    item.amount = Math.floor(item.quantity * item.originalPrice * (1 + percent / 100));
    renderExportProductSelector();
}

function removeExportItem(index) {
    exportedItems.splice(index, 1);
    renderExportProductSelector();
}

function addManualExportItem() {
    exportedItems.push({ name: "", quantity: 1, originalPrice: 1000, amount: 1100 });
    renderExportProductSelector();
}

function submitExportInvoice(taxCode) {
    const name = document.getElementById("customerNameInput").value.trim();
    const phone = document.getElementById("customerPhoneInput").value.trim();
    const taxCodeInput = document.getElementById("customerTaxCodeInput").value.trim();
    const address = document.getElementById("customerAddressInput").value.trim();
    const type = document.getElementById("customerTypeInput").value;
    const paid = document.getElementById("exportPaidCheckbox").checked;

    const customer = selectedCustomer || detectOrCreateCustomer(taxCode, { name, phone, taxCodeInput, address });
    customer.type = type;

    const items = exportedItems;
    const total = items.reduce((s, i) => s + i.amount, 0);
    const profit = items.reduce((s, i) => s + (i.amount - (i.originalPrice || 0) * i.quantity), 0);

    customer.history.push({
        invoiceCode: generateInvoiceCode(taxCode),
        date: new Date().toISOString().slice(0, 10),
        items, total, profit, paid,
        note: 'Xuất hàng thủ công'
    });

    // Trừ tồn kho nếu có sản phẩm từ kho
    for (const item of items) {
        const stockItem = (tonkhoMain[taxCode] || []).find(i => i.name === item.name);
        if (stockItem) stockItem.stock -= item.quantity;
    }

    closePopup();
    renderCustomerTab(taxCode);
    alert("✅ Đã xuất hàng cho khách " + customer.name);
}

function randomExportItems(taxCode) {
    const target = parseFloat(document.getElementById("exportTargetAmount").value);
    const percent = parseFloat(document.getElementById("exportProfitPercent").value || 10);
    if (!target || target <= 0) return alert("❗ Vui lòng nhập số tiền mục tiêu.");

    const inventory = (tonkhoMain[taxCode] || []).filter(i => i.stock > 0);
    inventory.sort((a, b) => a.price - b.price);

    let result = [], remaining = target;
    for (const item of inventory) {
        const sellPrice = Math.floor(item.price * (1 + percent / 100));
        const maxQty = Math.min(item.stock, Math.floor(remaining / sellPrice));
        if (maxQty <= 0) continue;
        result.push({ name: item.name, quantity: maxQty, originalPrice: item.price, amount: sellPrice * maxQty });
        remaining -= sellPrice * maxQty;
        if (remaining <= 0) break;
    }

    if (result.length === 0) return alert("⚠️ Không tìm được hàng phù hợp!");
    exportedItems = result;
    renderExportProductSelector(taxCode);
}




//////////////////////////
function openExportPopup(taxCode, customerIndex) {
    const customer = hkdData[taxCode].customers[customerIndex];
    alert(`📤 Mở popup xuất hàng cho KH: ${customer.name}`);
    // TODO: Mở popup riêng để xuất hàng cho KH này
}


// ✅ Gợi ý autocomplete tên KH (chỉ KH loại hộ kinh doanh)
function setupCustomerNameAutocomplete(taxCode) {
    const nameInput = document.getElementById(`export-customer-${taxCode}-name`);
    if (!nameInput) return;

    nameInput.addEventListener('input', () => {
        const keyword = nameInput.value.toLowerCase();
        const khList = (hkdData[taxCode].customers || []).filter(kh =>
            kh.type === 'ho_kinh_doanh' && kh.name.toLowerCase().includes(keyword)
        );

        const datalistId = `datalist-${taxCode}`;
        let datalist = document.getElementById(datalistId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            document.body.appendChild(datalist);
            nameInput.setAttribute('list', datalistId);
        }

        datalist.innerHTML = khList.map(kh =>
            `<option value="${kh.name}">${kh.phone ? ` - ${kh.phone}` : ''}</option>`
        ).join('');
    });
}

// ✅ Áp dụng khi render tab xuất hàng

// ✅ Sửa randomExportGoodsByMoney để random KH
// ✅ Sửa randomExportGoodsByMoney để random KH
function randomExportGoodsByMoney(taxCode) {
    const hkd = hkdData[taxCode];
    if (!hkd) return;

    const target = parseFloat(document.getElementById(`export-customer-${taxCode}-target`).value || 0);
    const profitPercent = parseFloat(document.getElementById(`export-customer-${taxCode}-profit`).value || 10);

    // ✅ Gán KH mặc định là "Khách lẻ" nếu chưa có
    const nameInput = document.getElementById(`export-customer-${taxCode}-name`);
    const addressInput = document.getElementById(`export-customer-${taxCode}-address`);
    if (nameInput) nameInput.value = getRandomCustomerName();
    if (addressInput) addressInput.value = getRandomCustomerAddress();

    let list = JSON.parse(JSON.stringify(hkd.tonkhoMain || []));
    list.forEach(i => {
        const cost = parseFloat(i.price || 0);
        i.sellPrice = roundToNearest(cost * (1 + profitPercent / 100), 500);
        i.exportQty = 0;
    });
    list.sort((a, b) => a.sellPrice - b.sellPrice);

    const selected = [];
    let sum = 0;
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const maxQty = Math.floor(item.quantity);
        const price = item.sellPrice;
        for (let qty = 1; qty <= maxQty; qty++) {
            const lineTotal = price * qty;
            if (sum + lineTotal > target * 1.05) break;
            item.exportQty = qty;
            selected.push({ ...item });
            sum += lineTotal;
            break;
        }
        if (sum >= target * 0.95) break;
    }

    hkd.tempExportList = selected;
    renderExportGoodsTable(taxCode, selected);
}

function submitExportGoods(taxCode, exportList, customerInfo = {}) {
  const hkd = hkdData[taxCode];
  if (!hkd) return;

  const timestamp = new Date().toISOString();
  let total = 0;

  const validItems = exportList.filter(item => parseFloat(item.exportQty) > 0);

  validItems.forEach(item => {
    const qty = parseFloat(item.exportQty);
    const price = parseFloat(item.sellPrice || 0);
    total += qty * price;

    const match = hkd.tonkhoMain.find(i => i.name === item.name && i.unit === item.unit);
    if (match) {
      match.quantity -= qty;
      if (match.quantity <= 0) {
        hkd.tonkhoMain = hkd.tonkhoMain.filter(i => !(i.name === match.name && i.unit === match.unit));
      }
    }
  });

  hkd.exports = hkd.exports || [];
  hkd.exports.push({
    date: timestamp,
    customer: customerInfo,
    items: validItems,
    total: Math.round(total)
  });

  if (!hkd.customers) hkd.customers = [];
  const existed = hkd.customers.find(c =>
    c.name === customerInfo.name &&
    c.address === customerInfo.address &&
    c.phone === customerInfo.phone
  );

  if (!existed) {
    hkd.customers.push({
      name: customerInfo.name,
      address: customerInfo.address,
      phone: customerInfo.phone || '',
      taxCodeInput: customerInfo.mst || '',
      type: customerInfo.type || 'ho_kinh_doanh',
      history: [{
        date: timestamp,
        items: validItems,
        total: Math.round(total)
      }]
    });
  } else {
    existed.history = existed.history || [];
    existed.history.push({
      date: timestamp,
      items: validItems,
      total: Math.round(total)
    });
  }

  saveDataToLocalStorage();
  renderTonKhoTab(taxCode, 'main');
  renderExportGoodsTab(taxCode);
  renderCustomerTab(taxCode);
  renderExportHistoryTable(taxCode);
  showToast('✅ Đã xuất hàng và cập nhật kho, khách hàng.', 3000, 'success');
}
function renderCustomerTab(taxCode) {
  const container = document.getElementById("customerManagerContainer");
  if (!container || !hkdData[taxCode]) {
    showToast('❌ Không tìm thấy container hoặc dữ liệu HKD', 3000, 'error');
    return;
  }

  const list = (hkdData[taxCode].customers || []).map((c, i) => {
    const total = c.history?.reduce((s, h) => s + (h.total || 0), 0) || 0;
    const profit = c.history?.reduce((s, h) => s + (h.profit || 0), 0) || 0;
    return `
      <tr>
        <td>${c.name || '-'}</td>
        <td>${c.phone || ''}</td>
        <td>${c.taxCodeInput || ''}</td>
        <td>${c.address || ''}</td>
        <td>${c.type || ''}</td>
        <td>${c.history?.length || 0}</td>
        <td>${formatNumber(total)} đ</td>
        <td>${formatNumber(profit)} đ</td>
        <td><button onclick="openCustomerDetailPopup('${taxCode}', ${i})">📜 Chi tiết</button></td>
        <td><button onclick="showCustomerHistory('${taxCode}', hkdData['${taxCode}'].customers[${i}])">📜</button></td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <h3>👥 Danh sách khách hàng (${hkdData[taxCode].customers?.length || 0})</h3>
    <table class="table">
      <tr>
        <th>Tên</th><th>SĐT</th><th>MST</th><th>Địa chỉ</th><th>Loại</th>
        <th>SL hóa đơn</th><th>Doanh thu</th><th>Lợi nhuận</th><th colspan=2>Thao tác</th>
      </tr>
      ${list}
    </table>
  `;
}

function viewCustomerHistory(taxCode, index) {
    const kh = hkdData[taxCode].customers[index];
    if (!kh) return;
    let html = `<h3>📜 Lịch sử của ${kh.name}</h3>`;
    if (!kh.history || kh.history.length === 0) {
        html += '<p>Chưa có lịch sử.</p>';
    } else {
        html += '<table class="table"><thead><tr><th>Ngày</th><th>SL dòng</th><th>Tổng tiền</th><th>TT</th></tr></thead><tbody>';
        kh.history.slice().reverse().forEach(h => {
            const date = new Date(h.date).toLocaleString('vi-VN');
            html += `<tr>
        <td>${date}</td>
        <td>${h.items?.length || 0}</td>
        <td>${formatCurrency(h.total)}</td>
        <td>${h.isPaid ? '✔' : '❌'}</td>
      </tr>`;
        });
        html += '</tbody></table>';
    }
    showPopup(html);
}

function editCustomer(taxCode, index) {
    const kh = hkdData[taxCode].customers[index];
    if (!kh) return;
    const name = prompt("Tên KH:", kh.name);
    if (name !== null) kh.name = name.trim();
    const phone = prompt("SĐT:", kh.phone || '');
    if (phone !== null) kh.phone = phone.trim();
    const address = prompt("Địa chỉ:", kh.address || '');
    if (address !== null) kh.address = address.trim();
    saveDataToLocalStorage();
    renderCustomerTab(taxCode);
}

function deleteCustomer(taxCode, index) {
    if (!confirm("Bạn có chắc muốn xóa KH này?")) return;
    hkdData[taxCode].customers.splice(index, 1);
    saveDataToLocalStorage();
    renderCustomerTab(taxCode);
}

function formatCurrency(value) {
    return (value || 0).toLocaleString('vi-VN') + ' đ';
}

function showPopup(content) {
    const popup = document.createElement('div');
    popup.id = 'popup';
    popup.innerHTML = `<div class="popup-content">${content}<br><br><button onclick="document.getElementById('popup').remove()">Đóng</button></div>`;
    document.body.appendChild(popup);
}

let currentExportTaxCode = null;
let currentExportCustomer = null;

function openExportPopupForCustomer(taxCode, customerIndex) {
    const hkd = hkdData[taxCode];
    const customer = hkdData[taxCode].customers[customerIndex];
    if (!hkd || !customer) return;

    currentExportTaxCode = taxCode;
    currentExportCustomer = customer;

    const list = (hkd.tonkhoMain || []).map(item => ({
        ...item,
        exportQty: 0,
        sellPrice: getSuggestedSellPrice(item)
    }));

    const popupTitle = document.getElementById('export-popup-title');
    const popupContent = document.getElementById('export-popup-content');
    const popup = document.getElementById('export-popup');

    if (!popup || !popupTitle || !popupContent) {
        alert("❌ Không tìm thấy popup xuất hàng trong HTML");
        return;
    }

    let html = `<table border="1" width="100%" cellpadding="4" cellspacing="0">
    <tr>
      <th>STT</th><th>Tên</th><th>SL tồn</th><th>Giá bán</th><th>SL xuất</th>
    </tr>`;

    list.forEach((item, idx) => {
        html += `<tr>
      <td>${idx + 1}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${item.sellPrice}</td>
      <td><input type="number" min="0" style="width:60px" id="popup-export-qty-${idx}" value="0"></td>
    </tr>`;
    });

    html += `</table>`;

    popupTitle.innerText = `📤 Xuất hàng cho: ${customer.name}`;
    popupContent.innerHTML = html;
    popup.style.display = 'block';

    window.exportTempList = list;
}

function closeExportPopup() {
    document.getElementById('export-popup').style.display = 'none';
}

function submitExportFromPopup() {
    const list = window.exportTempList || [];
    const exportList = list.map((item, idx) => {
        const qty = parseFloat(document.getElementById(`popup-export-qty-${idx}`).value) || 0;
        return { ...item, exportQty: qty };
    }).filter(i => i.exportQty > 0);

    if (exportList.length === 0) {
        alert("⚠️ Chưa chọn hàng để xuất");
        return;
    }

    submitExportGoods(currentExportTaxCode, exportList, {
        ...currentExportCustomer,
        type: 'ho_kinh_doanh'
    });

    closeExportPopup();
}
function getRandomCustomerName() {
    const names = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'];
    return names[Math.floor(Math.random() * names.length)];
}

function getRandomCustomerAddress() {
    const addresses = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];
    return addresses[Math.floor(Math.random() * addresses.length)];
}
////////////////////////
function openCustomerDetailPopup(taxCode, customerIndex) {
  const kh = hkdData[taxCode].customers[customerIndex];
  if (!kh) {
    showToast('❌ Không tìm thấy khách hàng', 3000, 'error');
    return;
  }

  const content = `
    <div>
      <h3>Chi tiết khách hàng: ${kh.name}</h3>
      <table class="summary-table">
        <tr><td><b>Tên KH:</b></td><td>${kh.name}</td>
            <td><b>Loại:</b></td><td>${kh.type}</td></tr>
        <tr><td><b>MST:</b></td><td>${kh.taxCode || ''}</td>
            <td><b>SĐT:</b></td><td>${kh.phone || ''}</td></tr>
        <tr><td><b>Địa chỉ:</b></td><td colspan="3">${kh.address || ''}</td></tr>
        <tr><td><b>Số đơn hàng:</b></td><td>${kh.history?.length || 0}</td>
            <td><b>Lần mua cuối:</b></td><td>${getLastBuyDate(kh)}</td></tr>
        <tr><td><b>Doanh thu:</b></td><td>${formatMoney(getCustomerRevenue(kh))}</td>
            <td><b>Lợi nhuận:</b></td><td>${formatMoney(getCustomerProfit(kh))}</td></tr>
        <tr><td><b>Đã thanh toán:</b></td><td>${formatMoney(getCustomerPaid(kh))}</td>
            <td><b>Còn nợ:</b></td><td>${formatMoney(getCustomerDebt(kh))}</td></tr>
      </table>
      <h4>Tổng hợp hàng đã mua</h4>
      ${renderCustomerGoodsTable(kh)}
      <h4>Lịch sử hóa đơn</h4>
      ${renderCustomerInvoiceHistory(kh)}
      <h4>Xuất hàng</h4>
      ${renderExportSectionForCustomer(taxCode, customerIndex)}
    </div>
  `;

  showPopup(content, `Chi tiết khách hàng: ${kh.name}`);
}

function closeCustomerDetailPopup() {
    const popup = document.getElementById('customer-detail-popup');
    if (popup) popup.style.display = 'none';
}

function getLastBuyDate(kh) {
    if (!kh.history || kh.history.length === 0) return '-';
    const last = kh.history.slice().sort((a, b) => b.date - a.date)[0];
    return new Date(last.date).toLocaleDateString('vi-VN');
}

function formatMoney(n) {
    return (n || 0).toLocaleString('vi-VN') + ' đ';
}

function renderCustomerGoodsTable(kh) {
    const productMap = {};
    kh.history?.forEach(entry => {
        entry.items.forEach(item => {
            const key = item.name + '|' + (item.unit || '');
            if (!productMap[key]) {
                productMap[key] = { name: item.name, unit: item.unit, qty: 0, amount: 0, tax: 0, count: 0 };
            }
            productMap[key].qty += Number(item.qty || 0);
            productMap[key].amount += Number(item.amount || 0);
            productMap[key].tax += Number(item.tax || 0);
            productMap[key].count++;
        });
    });

    const rows = Object.values(productMap);
    if (rows.length === 0) return `<i>Chưa có dữ liệu</i>`;

    let html = `<table border="1" cellspacing="0" cellpadding="4" style="width:100%; background:#fff;">
    <tr>
      <th>STT</th>
      <th>Tên hàng hóa</th>
      <th>ĐVT</th>
      <th>SL mua</th>
      <th>Giá TB</th>
      <th>Thuế TB</th>
      <th>Thành tiền</th>
    </tr>`;

    rows.forEach((p, i) => {
        const avgPrice = p.qty ? (p.amount / p.qty) : 0;
        const avgTax = p.qty ? (p.tax / p.qty) : 0;
        html += `<tr>
          <td>${i + 1}</td>
          <td>${p.name}</td>
          <td>${p.unit || ''}</td>
          <td>${p.qty}</td>
          <td>${avgPrice.toFixed(0)}</td>
          <td>${avgTax.toFixed(0)}</td>
          <td>${p.amount.toLocaleString('vi-VN')} đ</td>
        </tr>`;
    });

    html += `</table>`;
    return html;
}


function renderCustomerInvoiceHistory(kh) {
    if (!kh.history || kh.history.length === 0) return `<i>Chưa có hóa đơn nào</i>`;

    let html = `<table border="1" cellspacing="0" cellpadding="4" style="width:100%; background:#fff;">
    <tr><th>Ngày</th><th>Số dòng</th><th>Tổng tiền</th><th>Trạng thái</th></tr>`;

    kh.history.slice().reverse().forEach(entry => {
        html += `<tr>
      <td>${new Date(entry.date).toLocaleString('vi-VN')}</td>
      <td>${entry.items.length}</td>
      <td>${entry.total.toLocaleString('vi-VN')} đ</td>
      <td>${entry.isPaid ? '✔ Đã thanh toán' : '❌ Chưa thanh toán'}</td>
    </tr>`;
    });

    html += `</table>`;
    return html;
}


function renderExportSectionForCustomer(taxCode, customerIndex) {
  const kh = hkdData[taxCode].customers[customerIndex];
  const hkd = hkdData[taxCode];
  if (!hkd || !kh) {
    showToast('❌ Không tìm thấy dữ liệu HKD hoặc khách hàng', 3000, 'error');
    console.error('renderExportSectionForCustomer error:', { taxCode, customerIndex, customers: hkdData[taxCode]?.customers });
    return '';
  }

  // Khởi tạo tempExportListForKH nếu chưa tồn tại
  if (!hkd.tempExportListForKH || hkd.tempExportListForKH.length === 0) {
    hkd.tempExportListForKH = (hkd.tonkhoMain || []).map(item => ({
      ...item,
      exportQty: 0,
      sellPrice: getSuggestedSellPrice(item)
    }));
  }

  // Kiểm tra nếu không có hàng hóa để xuất
  if (!hkd.tonkhoMain || hkd.tonkhoMain.length === 0) {
    console.warn('renderExportSectionForCustomer: No items in tonkhoMain', { taxCode, tonkhoMain: hkd.tonkhoMain });
    return `<p><i>Chưa có hàng hóa trong kho để xuất</i></p>`;
  }

  const idPrefix = `export-${taxCode}-${customerIndex}`;

  const rows = hkd.tempExportListForKH.map((item, i) => {
    return `<tr>
      <td>${i + 1}</td>
      <td>${item.name || '-'}</td>
      <td>${item.unit || ''}</td>
      <td>${item.qty || 0}</td>
      <td><input type="number" value="${item.exportQty || 0}" min="0" max="${item.qty || 0}"
          onchange="updateExportQty('${taxCode}', ${customerIndex}, ${i}, this.value)">
      </td>
      <td><input type="number" value="${item.sellPrice || 0}"
          onchange="updateExportPrice('${taxCode}', ${customerIndex}, ${i}, this.value)">
      </td>
    </tr>`;
  }).join('');

  return `
    <div style="margin:10px 0;">
      Mục tiêu: <input id="${idPrefix}-target" type="number" style="width:100px"> đ
      % LN: <input id="${idPrefix}-profit" type="number" style="width:60px" value="10">
      <button onclick="randomExportGoodsByCustomer('${taxCode}', ${customerIndex})">🎲 Random</button>
<button onclick="submitExportOrder('${taxCode}')">📤 Xuất hàng</button>
    </div>
    <table border="1" cellpadding="4" cellspacing="0" style="width:100%; background:#fff;">
      <tr><th>STT</th><th>Tên</th><th>ĐVT</th><th>Tồn</th><th>SL xuất</th><th>Giá bán</th></tr>
      ${rows}
    </table>`;
}

function updateExportQty(taxCode, index, newQty) {
  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.tempExportList) return;

  index = parseInt(index);
  newQty = parseInt(newQty);
  if (isNaN(index) || isNaN(newQty) || newQty < 0) return;

  const list = hkd.tempExportList;
  const item = list[index];
  if (!item) return;

  const stockItem = (hkd.tonkhoMain || []).find(i => i.name === item.name && i.unit === item.unit);
  const maxQty = stockItem ? parseFloat(stockItem.quantity) : 0;

  item.exportQty = Math.min(newQty, maxQty);

  // Tính lại tổng tiền (giữ nguyên giá bán)
  item.amount = Math.floor(item.exportQty * item.sellPrice);

  // Cập nhật lại bảng hiển thị
  renderExportGoodsTable(taxCode, list);
}

function updateExportPrice(taxCode, index, newPrice) {
  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.tempExportList) return;

  index = parseInt(index);
  newPrice = parseFloat(newPrice);
  if (isNaN(index) || isNaN(newPrice) || newPrice < 0) return;

  const list = hkd.tempExportList;
  const item = list[index];
  if (!item) return;

  item.sellPrice = newPrice;
  item.amount = Math.floor((item.exportQty || 0) * newPrice);

  renderExportGoodsTable(taxCode, list);
}


function randomExportGoodsByCustomer(taxCode, customerIndex) {
  const profit = Number(document.getElementById(`export-${taxCode}-${customerIndex}-profit`).value) || 10;
  const target = Number(document.getElementById(`export-${taxCode}-${customerIndex}-target`).value) || 0;
  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.tonkhoMain || hkd.tonkhoMain.length === 0) {
    showToast('❌ Không có hàng hóa trong kho để random', 3000, 'error');
    console.error('randomExportGoodsByCustomer error:', { taxCode, tonkhoMain: hkd?.tonkhoMain });
    return;
  }

  // Khởi tạo lại tempExportListForKH nếu rỗng
  if (!hkd.tempExportListForKH || hkd.tempExportListForKH.length === 0) {
    hkd.tempExportListForKH = hkd.tonkhoMain.map(item => ({
      ...item,
      exportQty: 0,
      sellPrice: getSuggestedSellPrice(item, profit)
    }));
  }

  // Reset exportQty trước khi random
  hkd.tempExportListForKH.forEach(item => {
    item.exportQty = 0;
    item.sellPrice = getSuggestedSellPrice(item, profit);
  });

  let sum = 0;
  for (let item of hkd.tempExportListForKH) {
    if (sum >= target) break;
    const price = getSuggestedSellPrice(item, profit);
    const exportQty = Math.min(item.qty, Math.ceil((target - sum) / price));
    if (exportQty > 0) {
      item.exportQty = exportQty;
      item.sellPrice = price;
      sum += exportQty * price;
    }
  }

  // Render lại popup để cập nhật giao diện
  openCustomerDetailPopup(taxCode, customerIndex);
}

function submitExportForCustomer(taxCode, customerIndex) {
    const hkd = hkdData[taxCode];
    const kh = hkd.customers[customerIndex];
const list = Array.isArray(hkd.tempExportListForKH)
  ? hkd.tempExportListForKH.filter(i => i.exportQty > 0)
  : [];
    if (list.length === 0) return alert("Chưa chọn hàng để xuất");

    const total = list.reduce((sum, i) => sum + i.exportQty * i.sellPrice, 0);
    const exportItems = list.map(i => ({
        name: i.name,
        unit: i.unit,
        qty: i.exportQty,
        price: i.sellPrice,
        amount: i.exportQty * i.sellPrice,
        tax: 0
    }));

    // Trừ tồn kho
    for (let item of list) {
        const tonkhoItem = hkd.tonkhoMain.find(t => t.name === item.name && t.unit === item.unit);
        if (tonkhoItem) tonkhoItem.qty -= item.exportQty;
    }

    const newInvoice = {
        date: Date.now(),
        total,
        isPaid: true,
        items: exportItems,
        profit: 0
    };

    kh.history = kh.history || [];
    kh.history.push(newInvoice);

    saveDataToLocalStorage();
    alert("✅ Đã xuất hàng thành công");
    closeCustomerDetailPopup();
    renderCustomerTab(taxCode);
    renderTonKhoTab(taxCode);
}

function getCustomerRevenue(kh) {
    return kh.history?.reduce((sum, h) => sum + (h.total || 0), 0) || 0;
}
function getCustomerProfit(kh) {
    return kh.history?.reduce((sum, h) => sum + (h.profit || 0), 0) || 0;
}
function getCustomerPaid(kh) {
    return kh.history?.reduce((sum, h) => sum + (h.isPaid ? h.total : 0), 0) || 0;
}
function getCustomerDebt(kh) {
    return kh.history?.reduce((sum, h) => sum + (!h.isPaid ? h.total : 0), 0) || 0;
}

function getSuggestedSellPrice(item, profitPercent = 10) {
  const price = parseFloat(item.price || 0);
  if (price <= 0) return 0;
  return roundToNearest(price * (1 + profitPercent / 100), 500);
}
