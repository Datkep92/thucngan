function randomExportGoodsByMoney(taxCode) {
    const hkd = hkdData[taxCode];
    if (!hkd) return;

    const target = parseFloat(document.getElementById(`export-customer-${taxCode}-target`).value || 0);
    const profitPercent = parseFloat(document.getElementById(`export-customer-${taxCode}-profit`).value || 10);

    // ✅ Gán KH mặc định là "Khách lẻ" nếu chưa có
    const nameInput = document.getElementById(`export-customer-${taxCode}-name`);
    const addressInput = document.getElementById(`export-customer-${taxCode}-address`);
    if (nameInput && nameInput.value.trim() === '') nameInput.value = 'Khách lẻ';
    if (addressInput && addressInput.value.trim() === '') addressInput.value = 'Chưa rõ';

    let list = JSON.parse(JSON.stringify(hkd.tonkhoMain || []));

    // ✅ Gán giá bán có lợi nhuận
    list.forEach(i => {
        const cost = parseFloat(i.price || 0);
        i.sellPrice = roundToNearest(cost * (1 + profitPercent / 100), 500);
        i.exportQty = 0;
    });

    // ✅ Ưu tiên hàng giá rẻ → chọn dễ đạt mục tiêu
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
            break; // chỉ lấy 1 mặt hàng mỗi loại
        }

        if (sum >= target * 0.95) break;
    }

    hkd.tempExportList = selected;
    renderExportGoodsTable(taxCode, selected);
}
function showCustomerHistory(taxCode, kh) {
    const contentDiv = document.getElementById("customer-history-content");
    const popup = document.getElementById("customer-history-popup");

    if (!contentDiv || !popup) return;

    let html = `<div>`;
    html += `<h3>🕓 Lịch sử giao dịch của: <span style="color:blue">${kh.name}</span></h3>`;

    if (!kh.history || kh.history.length === 0) {
        html += `<i>Chưa có giao dịch</i>`;
    } else {
        html += `<table border="1" cellpadding="4" cellspacing="0" style="width:100%; background:#fff; margin-top:6px;">`;
        html += `<thead><tr><th>Ngày</th><th>Số lượng</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>`;

        kh.history.slice().reverse().forEach(entry => {
            const date = new Date(entry.date).toLocaleString('vi-VN');
            const total = entry.total.toLocaleString();
            const status = entry.isPaid ? '✔ Đã thanh toán' : '❌ Chưa thanh toán';
            html += `<tr>
        <td>${date}</td>
        <td>${entry.items.length}</td>
        <td>${total} đ</td>
        <td>${status}</td>
      </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    contentDiv.innerHTML = html;
    popup.style.display = "block";
}

function closeCustomerHistoryPopup() {
    const popup = document.getElementById("customer-history-popup");
    if (popup) popup.style.display = "none";
}

let customerNameChangeHandler = null;

function handleCustomerNameChange(taxCode) {
  const nameInput = document.getElementById(`export-customer-${taxCode}-name`);
  if (!nameInput) return;

  if (customerNameChangeHandler) {
    nameInput.removeEventListener('change', customerNameChangeHandler);
  }

  customerNameChangeHandler = () => {
    const name = nameInput.value.trim();
    const kh = (hkdData[taxCode]?.customers || []).find(c => c.name === name);

    if (kh) {
      document.getElementById(`export-customer-${taxCode}-address`).value = kh.address || '';
      document.getElementById(`export-customer-${taxCode}-phone`).value = kh.phone || '';
      document.getElementById(`export-customer-${taxCode}-mst`).value = kh.taxCodeInput || '';

      const typeInput = document.querySelector(`input[name="export-customer-${taxCode}-type"][value="${kh.type}"]`);
      if (typeInput) typeInput.checked = true;

      showCustomerHistory(taxCode, kh);
    } else {
      const historyDiv = document.getElementById(`${taxCode}-customer-history`);
      if (historyDiv) historyDiv.remove();
    }
  };

  nameInput.addEventListener('change', customerNameChangeHandler);
}

function renderExportGoodsTab(taxCode) {
  const hkd = hkdData[taxCode];
  if (!hkd) {
    showToast('❌ Không tìm thấy dữ liệu HKD', 3000, 'error');
    return;
  }

  const list = JSON.parse(JSON.stringify(hkd.tonkhoMain || [])).map(item => ({
    ...item,
    exportQty: 0,
    sellPrice: getSuggestedSellPrice(item)
  }));

  hkdData[taxCode].tempExportList = list;

  const khList = (hkdData[taxCode]?.customers || []).map(c => c.name);
  const datalistId = `kh-datalist-${taxCode}`;
  const datalist = `
    <datalist id="${datalistId}">
      ${khList.map(name => `<option value="${name}">`).join('\n')}
    </datalist>
  `;

  const form = `
    <div class="export-form">
      <b>🧑‍💼 Thông tin khách hàng:</b><br>
      Tên KH: <input list="${datalistId}" id="export-customer-${taxCode}-name" placeholder="Nguyễn Văn A">
      MST: <input id="export-customer-${taxCode}-mst" placeholder="123456789">
      Địa chỉ: <input id="export-customer-${taxCode}-address" placeholder="Hà Nội">
      SĐT: <input id="export-customer-${taxCode}-phone" placeholder="0901234567">
      <br><br>
      💸 Số tiền mục tiêu: <input id="export-customer-${taxCode}-target" type="number" style="width:100px" min="0"> đ
      % lợi nhuận: <input id="export-customer-${taxCode}-profit" type="number" style="width:60px" value="10" min="0">
      <button onclick="randomExportGoodsByMoney('${taxCode}')">🎲 Random hàng</button>
      <button onclick="updateSellPricesByProfit('${taxCode}', document.getElementById('export-customer-${taxCode}-profit').value)">💹 Cập nhật giá bán</button>
<button onclick="submitExportOrder('${taxCode}')">📤 Xuất hàng</button>
    </div>
    ${datalist}
  `;

  const container = document.getElementById(`${taxCode}-xuathang`);
  if (container) {
    container.innerHTML = `
      ${form}
      <div id="${taxCode}-exportGoodsTable"></div>
    `;
    renderExportGoodsTable(taxCode, list);
    handleCustomerNameChange(taxCode);
    setupCustomerAutocomplete(taxCode);
  } else {
    showToast('❌ Không tìm thấy container tab xuất hàng', 3000, 'error');
  }
}

// Gắn hàm vào window để sử dụng toàn cục
window.renderExportGoodsTab = renderExportGoodsTab;
// Gắn hàm vào window để sử dụng toàn cục
window.renderExportGoodsTab = renderExportGoodsTab;

function submitExportForCustomer(taxCode, customerIndex) {
  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.customers || !hkd.customers[customerIndex]) {
    alert("❗ Không tìm thấy thông tin khách hàng.");
    return;
  }

  const kh = hkd.customers[customerIndex];
  const list = Array.isArray(hkd.tempExportListForKH)
    ? hkd.tempExportListForKH.filter(i => i.exportQty > 0)
    : [];

  if (list.length === 0) {
    alert("❗ Chưa chọn hàng để xuất.");
    return;
  }

  // Tạo danh sách hóa đơn
  const exportItems = list.map(i => ({
    name: i.name,
    unit: i.unit,
    qty: i.exportQty,
    price: i.sellPrice,
    amount: i.exportQty * i.sellPrice,
    tax: 0
  }));

  const total = exportItems.reduce((sum, i) => sum + i.amount, 0);

  // ✅ Trừ tồn kho và xóa hàng nếu hết
  for (let item of list) {
    const stock = hkd.tonkhoMain.find(t => t.name === item.name && t.unit === item.unit);
    if (stock) {
      stock.quantity -= item.exportQty;

      if (stock.quantity <= 0) {
        const idx = hkd.tonkhoMain.indexOf(stock);
        if (idx > -1) hkd.tonkhoMain.splice(idx, 1); // xóa khỏi tồn kho
      }
    }
  }

  // ✅ Ghi đơn hàng vào lịch sử KH
  const newInvoice = {
    date: Date.now(),
    total,
    isPaid: true,
    items: exportItems,
    profit: 0
  };

  kh.history = kh.history || [];
  kh.history.push(newInvoice);

  // ✅ Lưu và cập nhật giao diện
  saveDataToLocalStorage();
  alert("✅ Đã xuất hàng thành công");

  renderTonKhoTab(taxCode);
  renderCustomerTab(taxCode);
  renderExportGoodsTab(taxCode);
  renderExportHistoryTable(taxCode);

  closeCustomerDetailPopup();
}
// ✅ Cập nhật submitExportOrder để phân loại khách thân thiết và khách lẻ
function submitExportOrder(taxCode) {
  const hkd = hkdData[taxCode];
  if (!hkd) return;

  const list = Array.isArray(hkd.tempExportList)
    ? hkd.tempExportList.filter(i => i.exportQty > 0)
    : [];

  if (list.length === 0) {
    alert("❗ Chưa chọn hàng để xuất");
    return;
  }

  const getInput = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  const name = getInput(`export-customer-${taxCode}-name`);
  const address = getInput(`export-customer-${taxCode}-address`);
  const phone = getInput(`export-customer-${taxCode}-phone`);
  const mst = getInput(`export-customer-${taxCode}-taxcode`);

  const isKhachLe = !name && !address && !phone && !mst;
  const finalName = name || getRandomCustomerName();
  const finalAddress = address || getRandomCustomerAddress();
  const finalPhone = phone || '';
  const finalTaxCode = mst || '';

  const exportItems = list.map(i => ({
    name: i.name,
    unit: i.unit,
    qty: i.exportQty,
    price: i.sellPrice,
    amount: i.exportQty * i.sellPrice,
    tax: 0
  }));

  const total = exportItems.reduce((sum, i) => sum + i.amount, 0);

  // ✅ Trừ tồn kho và xóa hàng nếu hết
  for (let item of exportItems) {
    const stock = hkd.tonkhoMain.find(i => i.name === item.name && i.unit === item.unit);
    if (stock) {
      stock.quantity -= item.qty;

      // ✅ Cập nhật lại thành tiền tồn kho
      stock.amount = stock.quantity * stock.price;

      if (stock.quantity <= 0) {
        const idx = hkd.tonkhoMain.indexOf(stock);
        if (idx > -1) hkd.tonkhoMain.splice(idx, 1);
      }
    }
  }

  const newExport = {
    customerName: finalName,
    customerAddress: finalAddress,
    customerPhone: finalPhone,
    customerTaxCode: finalTaxCode,
    isKhachLe,
    isAutoCustomer: isKhachLe,
    items: exportItems,
    total,
    date: Date.now(),
    isPaid: true,
    profit: 0
  };

  hkd.exports = hkd.exports || [];
  hkd.exports.push(newExport);

  hkd.customers = hkd.customers || [];

  const existing = hkd.customers.find(kh =>
    kh.name === finalName &&
    kh.address === finalAddress &&
    kh.taxCode === finalTaxCode
  );

  if (existing) {
    existing.history = existing.history || [];
    existing.history.push(newExport);
  } else {
    hkd.customers.push({
      name: finalName,
      address: finalAddress,
      phone: finalPhone,
      taxCode: finalTaxCode,
      isAutoCustomer: isKhachLe,
      history: [newExport]
    });
  }

  saveDataToLocalStorage();
  alert("✅ Đã xuất hàng thành công!");

  updateMainTotalDisplay(taxCode);
  renderTonKhoTab(taxCode);
  renderExportGoodsTab(taxCode);
  renderCustomerTab(taxCode);
  renderExportHistoryTable(taxCode);
}

window.submitExportOrder = submitExportOrder;

function roundToNearest(value, step = 500) {
  return Math.round(value / step) * step;
}
// 🔁 Gắn global để gọi từ HTML
window.submitExportOrder = submitExportOrder;


////
// ✅ Hàm làm tròn giá về bội gần nhất của 500 hoặc 1000
function roundToNearest(value, step = 500) {
    return Math.round(value / step) * step;
}

// ✅ Hàm tính giá bán đề xuất từ đơn giá và thuế
function getSuggestedSellPrice(item, profitPercent = null) {
    const base = parseFloat(item.price) || 0;
    let rawTaxRate = item.taxRate || 0;

    // Chuyển "10%" → 10, "8%" → 8, "0%" → 0
    if (typeof rawTaxRate === 'string' && rawTaxRate.includes('%')) {
        rawTaxRate = rawTaxRate.replace('%', '');
    }

    const taxRate = parseFloat(rawTaxRate) || 0;
    const tax = base * taxRate / 100;

    let price = base + tax;

    if (profitPercent !== null) {
        price = base * (1 + profitPercent / 100); // nếu có % lợi nhuận thì thay thế hoàn toàn
    }

    return roundToNearest(price, 500); // làm tròn giá
}

// ✅ Hàm làm tròn giá về bội gần nhất của 500 hoặc 1000
function roundToNearest(value, step = 500) {
    return Math.round(value / step) * step;
}

// ✅ Hàm tính giá bán đề xuất từ đơn giá và thuế
function getSuggestedSellPrice(item, profitPercent = null) {
    const base = parseFloat(item.price) || 0;
    const tax = base * (parseFloat(item.taxRate) || 0) / 100;
    let price = base + tax;

    if (profitPercent !== null) {
        price = base * (1 + profitPercent / 100);
    }

    return roundToNearest(price, 500);
}


// ✅ Gọi khi người dùng nhập % lợi nhuận và muốn cập nhật giá bán



function exportGoodsToExcel(taxCode, customerInfo, exportList) {
    console.log("📝 Xuất Excel (chưa triển khai)", { taxCode, customerInfo, exportList });
}

function submitExportGoods(taxCode, exportList, customerInfo = {}) {
  const hkd = hkdData[taxCode];
  if (!hkd) {
    showToast('❌ Không tìm thấy dữ liệu HKD', 3000, 'error');
    return;
  }

  const timestamp = new Date().toISOString();
  let total = 0;

  const validItems = exportList.filter(item => parseFloat(item.exportQty) > 0);
  if (validItems.length === 0) {
    showToast('❗ Chưa chọn hàng để xuất', 3000, 'error');
    return;
  }

  validItems.forEach(item => {
    const qty = parseFloat(item.exportQty);
    const price = parseFloat(item.sellPrice || 0);
    total += qty * price;

    const match = hkd.tonkhoMain.find(i => i.name === item.name && i.unit === item.unit);
    if (match) {
      match.quantity = parseFloat(match.quantity) - qty;
      if (match.quantity <= 0) {
        hkd.tonkhoMain = hkd.tonkhoMain.filter(i => !(i.name === match.name && i.unit === match.unit));
      }
    }
  });

  hkd.exports = hkd.exports || [];
  hkd.exports.push({
    date: timestamp,
    customer: customerInfo,
    items: validItems.map(item => ({
      name: item.name,
      unit: item.unit,
      qty: item.exportQty,
      price: item.sellPrice,
      amount: item.exportQty * item.sellPrice,
      tax: 0
    })),
    total: Math.round(total),
    isPaid: true,
    profit: 0
  });

  if (!hkd.customers) hkd.customers = [];
  const existed = hkd.customers.find(c =>
    c.name === customerInfo.name &&
    c.address === customerInfo.address &&
    c.phone === customerInfo.phone
  );

  if (!existed) {
    hkd.customers.push({
      name: customerInfo.name || 'Khách lẻ',
      address: customerInfo.address || 'Chưa rõ',
      phone: customerInfo.phone || '',
      taxCodeInput: customerInfo.mst || '',
      type: customerInfo.type || 'ho_kinh_doanh',
      history: [{
        date: timestamp,
        items: validItems.map(item => ({
          name: item.name,
          unit: item.unit,
          qty: item.exportQty,
          price: item.sellPrice,
          amount: item.exportQty * item.sellPrice,
          tax: 0
        })),
        total: Math.round(total),
        isPaid: true
      }]
    });
  } else {
    existed.history = existed.history || [];
    existed.history.push({
      date: timestamp,
      items: validItems.map(item => ({
        name: item.name,
        unit: item.unit,
        qty: item.exportQty,
        price: item.sellPrice,
        amount: item.exportQty * item.sellPrice,
        tax: 0
      })),
      total: Math.round(total),
      isPaid: true
    });
  }

  saveDataToLocalStorage();
  renderTonKhoTab(taxCode, 'main');
  renderExportGoodsTab(taxCode);
  renderCustomerTab(taxCode);
  renderExportHistoryTable(taxCode);
  showToast('✅ Đã xuất hàng và cập nhật kho, khách hàng.', 3000, 'success');
}
function updateSingleExportRow(taxCode, index) {
  const list = hkdData[taxCode]?.tempExportList;
  if (!list || !list[index]) return;

  const item = list[index];
  const qty = parseFloat(item.exportQty) || 0;
  const lineTotal = qty * parseFloat(item.sellPrice || 0);

  const row = document.querySelector(`#${taxCode}-exportGoodsTable tr:nth-child(${index + 2})`);
  if (row) {
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.unit}</td>
      <td>${item.quantity}</td>
      <td><input type="number" value="${qty}" onchange="updateExportQty('${taxCode}', ${index}, this.value)" style="width:60px"></td>
      <td><input type="number" value="${item.sellPrice}" onchange="updateSellPrice('${taxCode}', ${index}, this.value)" style="width:80px"></td>
      <td>${lineTotal.toLocaleString()} đ</td>
    `;
  }

  // Cập nhật tổng
  const total = list.reduce((sum, item) => sum + (parseFloat(item.exportQty || 0) * parseFloat(item.sellPrice || 0)), 0);
  const totalElement = document.querySelector(`#${taxCode}-exportGoodsTable div:last-child`);
  if (totalElement) {
    totalElement.innerHTML = `<b>💰 Tổng cộng:</b> ${total.toLocaleString()} đ`;
  }
}
/*
// ✅ Hiển thị lịch sử xuất hàng
function renderExportHistoryTable(taxCode) {
  const container = document.getElementById(`${taxCode}-lichsu`);
  if (!container) {
    showToast('❌ Không tìm thấy container lịch sử xuất hàng', 3000, 'error');
    return;
  }

  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.exports) {
    container.innerHTML = '<p>Chưa có lịch sử xuất hàng.</p>';
    return;
  }

  const html = hkd.exports.map((ex, idx) => {
    const total = ex.items.reduce((sum, item) => sum + (parseFloat(item.exportQty) * parseFloat(item.sellPrice)), 0);
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${ex.date}</td>
        <td>${ex.customer?.name || '-'}</td>
        <td>${ex.items.length}</td>
        <td>${formatCurrencyVN(total)}</td>
        <td><button onclick="openExportDetailPopup('${taxCode}', ${idx})">📜 Chi tiết</button></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <h3>📜 Lịch sử xuất hàng (${hkd.exports.length})</h3>
    <table class="table">
      <tr>
        <th>STT</th><th>Ngày</th><th>Khách hàng</th><th>Số lượng mục</th><th>Tổng tiền</th><th>Thao tác</th>
      </tr>
      ${html}
    </table>
  `;
}


*/
function renderExportGoodsTable(taxCode, list) {
  const container = document.getElementById(`${taxCode}-exportGoodsTable`);
  if (!container) return;

  let html = `
    <div style="margin: 10px 0;">
      <b>📦 Danh sách hàng hóa xuất:</b>
      <table border="1" cellpadding="4" cellspacing="0" style="width:100%; background:#fff;">
        <thead><tr>
          <th>STT</th><th>Tên</th><th>ĐVT</th><th>SL tồn</th><th>SL xuất</th><th>Giá bán</th><th>Thành tiền</th>
        </tr></thead>
        <tbody>
  `;

  let total = 0;

  list.forEach((item, i) => {
    const qty = parseFloat(item.exportQty) || 0;
    const lineTotal = qty * parseFloat(item.sellPrice || 0);
    total += lineTotal;

    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${item.name}</td>
        <td>${item.unit}</td>
        <td>${item.quantity}</td>
        <td><input type="number" value="${qty}" onchange="updateExportQty('${taxCode}', ${i}, this.value)" style="width:60px"></td>
        <td><input type="number" value="${item.sellPrice}" onchange="updateSellPrice('${taxCode}', ${i}, this.value)" style="width:80px"></td>
        <td>${lineTotal.toLocaleString()} đ</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <div style="margin-top:8px;">
        <b>💰 Tổng cộng:</b> ${total.toLocaleString()} đ
      </div>
    </div>
  `;

  container.innerHTML = html;
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
  updateSingleExportRow(taxCode, index);
}

function updateSellPrice(taxCode, index, value) {
  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.tempExportList) return;

  index = parseInt(index);
  const price = parseFloat(value) || 0;
  if (isNaN(index) || price < 0) {
    showToast('❌ Giá bán phải là số không âm', 3000, 'error');
    return;
  }

  const list = hkd.tempExportList;
  const item = list[index];
  if (!item) return;

  item.sellPrice = price;
  updateSingleExportRow(taxCode, index);
}


function showCustomerHistory(taxCode, kh) {
    const contentDiv = document.getElementById("customer-history-content");
    const popup = document.getElementById("customer-history-popup");

    if (!contentDiv || !popup) return;

    let html = `<div>`;
    html += `<h3>🕓 Lịch sử giao dịch của: <span style="color:blue">${kh.name}</span></h3>`;

    if (!kh.history || kh.history.length === 0) {
        html += `<i>Chưa có giao dịch</i>`;
    } else {
        html += `<table border="1" cellpadding="4" cellspacing="0" style="width:100%; background:#fff; margin-top:6px;">`;
        html += `<thead><tr><th>Ngày</th><th>Số lượng</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>`;

        kh.history.slice().reverse().forEach(entry => {
            const date = new Date(entry.date).toLocaleString('vi-VN');
            const total = entry.total.toLocaleString();
            const status = entry.isPaid ? '✔ Đã thanh toán' : '❌ Chưa thanh toán';
            html += `<tr>
        <td>${date}</td>
        <td>${entry.items.length}</td>
        <td>${total} đ</td>
        <td>${status}</td>
      </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    contentDiv.innerHTML = html;
    popup.style.display = "block";
}
function closeCustomerHistoryPopup() {
    document.getElementById("customer-history-popup").style.display = "none";
}
function clearTempExportData(taxCode) {
  if (hkdData[taxCode]) {
    hkdData[taxCode].tempExportList = [];
    hkdData[taxCode].tempExportListForKH = [];
  }
}
function setupCustomerAutocomplete(taxCode) {
  const input = document.getElementById(`export-customer-${taxCode}-name`);
  if (!input) return;

  const datalistId = `customer-datalist-${taxCode}`;
  let datalist = document.getElementById(datalistId);

  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = datalistId;
    document.body.appendChild(datalist);
    input.setAttribute('list', datalistId);
  }

  const list = (hkdData[taxCode]?.customers || []).map(c => c.name);
  datalist.innerHTML = list.map(name => `<option value="${name}">`).join('');
}

function clearEventListeners(taxCode) {
  const nameInput = document.getElementById(`export-customer-${taxCode}-name`);
  if (nameInput && customerNameChangeHandler) {
    nameInput.removeEventListener('change', customerNameChangeHandler);
    customerNameChangeHandler = null;
  }
}

// Gọi clearEventListeners trong openTab
function openTab(evt, tabId) {
  document.querySelectorAll(".tab-content").forEach(el => {
    if (el) el.style.display = "none";
  });

  document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));

  const target = document.getElementById(tabId);
  if (target) target.style.display = "block";

  if (evt?.currentTarget) evt.currentTarget.classList.add("active");

  const taxCode = tabId.split('-')[0];
  if (taxCode) {
    clearEventListeners(taxCode);
    if (!tabId.includes('xuathang')) {
      clearTempExportData(taxCode);
    }
  }

  if (tabId.includes('tonkho')) {
    renderTonKhoTab(taxCode, 'main');
  } else if (tabId.includes('qlyhoadon')) {
    renderInvoiceTab(taxCode);
  } else if (tabId.includes('xuathang')) {
    renderExportGoodsTab(taxCode);
  } else if (tabId.includes('lichsu')) {
    renderExportHistoryTable(taxCode);
  } else if (tabId.includes('quanlykh')) {
    renderCustomerTab(taxCode);
  }
}