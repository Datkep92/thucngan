// modules/exportGoodsTab.js




function updateSellPrice(taxCode, index, value) {
  const list = hkdData[taxCode].tempExportList;
  if (!list) return;
  list[index].sellPrice = parseFloat(value) || 0;
  renderExportGoodsTable(taxCode, list);
}

function updateExportQty(taxCode, index, value) {
  const list = hkdData[taxCode].tempExportList;
  if (!list) return;
  list[index].exportQty = parseFloat(value) || 0;
  renderExportGoodsTable(taxCode, list);
}

function randomExportGoodsByMoney(taxCode) {
  const hkd = hkdData[taxCode];
  if (!hkd) return;
  const target = parseFloat(document.getElementById(`export-customer-${taxCode}-target`).value || 0);
  const profitPercent = parseFloat(document.getElementById(`export-customer-${taxCode}-profit`).value || 0);

  let list = JSON.parse(JSON.stringify(hkd.tonkhoMain));
  list.forEach(i => {
    const cost = parseFloat(i.price || 0);
    i.sellPrice = Math.ceil(cost * (1 + profitPercent / 100));
    i.exportQty = 0;
  });

  const selected = [];
  let sum = 0;
  while (list.length && sum < target * 1.1) {
    const i = Math.floor(Math.random() * list.length);
    const item = list[i];
    const maxQty = Math.floor(parseFloat(item.quantity));
    const pickQty = Math.floor(Math.random() * (maxQty || 1)) + 1;
    const cost = item.sellPrice * pickQty;

    if (sum + cost > target * 1.1) break;
    item.exportQty = pickQty;
    selected.push(item);
    sum += cost;
    list.splice(i, 1);
  }
  renderExportGoodsTable(taxCode, selected);
}

function submitExportOrder(taxCode) {
  const hkd = hkdData[taxCode];
  const list = hkd.tempExportList || [];
  const name = document.getElementById(`export-customer-${taxCode}-name`).value.trim() || 'Khách lẻ';
  const address = document.getElementById(`export-customer-${taxCode}-address`).value.trim() || '-';
  const phone = document.getElementById(`export-customer-${taxCode}-phone`).value.trim() || '-';
  const mst = document.getElementById(`export-customer-${taxCode}-mst`).value.trim() || '-';
  const type = document.querySelector(`input[name="export-customer-${taxCode}-type"]:checked`).value || 'ca_nhan';

  const exportItems = list.filter(i => i.exportQty > 0).map(i => ({
    name: i.name,
    unit: i.unit,
    exportQty: i.exportQty,
    sellPrice: i.sellPrice,
    costPrice: i.price,
    profit: (i.sellPrice - i.price) * i.exportQty
  }));

  const total = exportItems.reduce((s, i) => s + i.sellPrice * i.exportQty, 0);

  hkd.exports = hkd.exports || [];
  hkd.exports.push({ name, address, phone, mst, type, time: new Date().toISOString(), items: exportItems, total });
  saveDataToLocalStorage();
  renderHKDTab(taxCode);
  toast("✅ Đã xuất hàng", 3000, 'success');
}

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


// ✅ Gọi khi người dùng nhập % lợi nhuận và muốn cập nhật giá bán
function updateSellPricesByProfit(taxCode, profitPercent) {
  const hkd = hkdData[taxCode];
  const list = JSON.parse(JSON.stringify(hkd.tonkhoMain || [])).map(item => ({
    ...item,
    exportQty: 0,
    sellPrice: getSuggestedSellPrice(item, profitPercent)
  }));

  renderExportGoodsTable(taxCode, list);
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

function renderExportGoodsTab(taxCode) {
  const hkd = hkdData[taxCode];
  const list = JSON.parse(JSON.stringify(hkd.tonkhoMain || [])).map(item => ({
    ...item,
    exportQty: 0,
    sellPrice: getSuggestedSellPrice(item) // Gán giá bán mặc định = đơn giá + thuế, làm tròn 500đ
  }));

  hkdData[taxCode].tempExportList = list;

  const form = `
    <div style="margin:10px 0; padding:8px; background:#f0f0f0;">
      <b>🧑‍💼 Thông tin khách hàng:</b><br>
      Tên KH: <input id="export-customer-${taxCode}-name" placeholder="Nguyễn Văn A">
      MST: <input id="export-customer-${taxCode}-mst" placeholder="123456789">
      Địa chỉ: <input id="export-customer-${taxCode}-address" placeholder="Hà Nội">
      SĐT: <input id="export-customer-${taxCode}-phone" placeholder="0901234567">
      Loại KH: 
        <label><input type="radio" name="export-customer-${taxCode}-type" value="ca_nhan" checked> Cá nhân</label>
        <label><input type="radio" name="export-customer-${taxCode}-type" value="ho_kinh_doanh"> Hộ kinh doanh</label>
      <br><br>
      💸 Số tiền mục tiêu: <input id="export-customer-${taxCode}-target" type="number" style="width:100px"> đ
      % lợi nhuận: <input id="export-customer-${taxCode}-profit" type="number" style="width:60px" value="10">
      <button onclick="randomExportGoodsByMoney('${taxCode}')">🎲 Random hàng</button>
      <button onclick="updateSellPricesByProfit('${taxCode}', document.getElementById('export-customer-${taxCode}-profit').value)">💹 Cập nhật giá bán</button>
      <button onclick="submitExportGoods('${taxCode}', hkdData['${taxCode}'].tempExportList, {
        name: document.getElementById('export-customer-${taxCode}-name').value,
        mst: document.getElementById('export-customer-${taxCode}-mst').value,
        phone: document.getElementById('export-customer-${taxCode}-phone').value,
        address: document.getElementById('export-customer-${taxCode}-address').value,
        type: document.querySelector('input[name=\\"export-customer-${taxCode}-type\\"]:checked').value
      })">📤 Xuất hàng</button>
    </div>
  `;

  const container = document.getElementById(`${taxCode}-exportTabPlaceholder`);
  container.innerHTML = form;
  renderExportGoodsTable(taxCode, list);
}

// ✅ Gọi khi người dùng nhập % lợi nhuận và muốn cập nhật giá bán
function updateSellPricesByProfit(taxCode, profitPercent) {
  const hkd = hkdData[taxCode];
  const list = JSON.parse(JSON.stringify(hkd.tonkhoMain || [])).map(item => ({
    ...item,
    exportQty: 0,
    sellPrice: getSuggestedSellPrice(item, profitPercent)
  }));

  renderExportGoodsTable(taxCode, list);
}
function renderExportGoodsTable(taxCode, list) {
  const container = document.getElementById(`${taxCode}-exportGoodsTable`);
  if (!container) {
    console.warn('Không tìm thấy vùng exportGoodsTable cho:', taxCode);
    return;
  }

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

  container.innerHTML = html; // ✅ Ghi đè vùng bảng, không ảnh hưởng form
}

// ✅ Hàm xử lý xuất hàng: xuất Excel, cập nhật tồn kho, lưu lịch sử
function submitExportGoods(taxCode, exportList, customerInfo = {}) {
  const hkd = hkdData[taxCode];
  const timestamp = new Date().toISOString();
  let total = 0;

  // Cập nhật tồn kho và tính tổng tiền xuất
  exportList.forEach(item => {
    const qty = parseFloat(item.exportQty);
    if (!qty || qty <= 0) return;

    total += qty * parseFloat(item.sellPrice);

    const match = hkd.tonkhoMain.find(i => i.name === item.name && i.unit === item.unit);
    if (match) {
      match.quantity -= qty;
      if (match.quantity < 0) match.quantity = 0;
    }
  });

  // Lưu lịch sử xuất
  if (!hkd.exports) hkd.exports = [];
  hkd.exports.push({
    date: timestamp,
    customer: customerInfo,
    items: exportList.filter(i => parseFloat(i.exportQty) > 0),
    total: Math.round(total)
  });

  exportGoodsToExcel(taxCode, customerInfo, exportList); // Xuất file Excel

  saveDataToLocalStorage();
  renderExportHistoryTable(taxCode);
  renderTonKhoTab(taxCode, 'main');
  renderExportGoodsTab(taxCode); // reset bảng sau khi xuất

  alert('✅ Đã xuất hàng và cập nhật kho.');
}

// ✅ Hiển thị lịch sử xuất hàng
function renderExportHistoryTable(taxCode) {
  const hkd = hkdData[taxCode];
  const history = hkd.exports || [];
  let html = '<table border="1" cellpadding="4" cellspacing="0" style="width:100%; background:#fff;">';
  html += '<thead><tr><th>Ngày</th><th>Khách hàng</th><th>Số dòng</th><th>Tổng tiền</th></tr></thead><tbody>';

  history.slice().reverse().forEach(entry => {
    const customer = entry.customer || {};
    const name = customer.name || '-';
    const date = new Date(entry.date).toLocaleString('vi-VN');
    const total = entry.total.toLocaleString();
    html += `<tr><td>${date}</td><td>${name}</td><td>${entry.items.length}</td><td>${total} đ</td></tr>`;
  });

  html += '</tbody></table>';
  document.getElementById(`${taxCode}-exportHistoryTable`).innerHTML = html;
}
function renderExportGoodsTab(taxCode) {
  const hkd = hkdData[taxCode];
  const list = JSON.parse(JSON.stringify(hkd.tonkhoMain || [])).map(item => ({
    ...item,
    exportQty: 0,
    sellPrice: getSuggestedSellPrice(item) // Gán giá bán mặc định = đơn giá + thuế, làm tròn 500đ
  }));

  hkdData[taxCode].tempExportList = list;

  // Tạo form thông tin KH
  const form = `
    <div style="margin:10px 0; padding:8px; background:#f0f0f0;">
      <b>🧑‍💼 Thông tin khách hàng:</b><br>
      Tên KH: <input id="export-customer-${taxCode}-name" placeholder="Nguyễn Văn A">
      MST: <input id="export-customer-${taxCode}-mst" placeholder="123456789">
      Địa chỉ: <input id="export-customer-${taxCode}-address" placeholder="Hà Nội">
      SĐT: <input id="export-customer-${taxCode}-phone" placeholder="0901234567">
      Loại KH: 
        <label><input type="radio" name="export-customer-${taxCode}-type" value="ca_nhan" checked> Cá nhân</label>
        <label><input type="radio" name="export-customer-${taxCode}-type" value="ho_kinh_doanh"> Hộ kinh doanh</label>
      <br><br>
      💸 Số tiền mục tiêu: <input id="export-customer-${taxCode}-target" type="number" style="width:100px"> đ
      % lợi nhuận: <input id="export-customer-${taxCode}-profit" type="number" style="width:60px" value="10">
      <button onclick="randomExportGoodsByMoney('${taxCode}')">🎲 Random hàng</button>
      <button onclick="updateSellPricesByProfit('${taxCode}', document.getElementById('export-customer-${taxCode}-profit').value)">💹 Cập nhật giá bán</button>
      <button onclick="submitExportGoods('${taxCode}', hkdData['${taxCode}'].tempExportList, {
        name: document.getElementById('export-customer-${taxCode}-name').value,
        mst: document.getElementById('export-customer-${taxCode}-mst').value,
        phone: document.getElementById('export-customer-${taxCode}-phone').value,
        address: document.getElementById('export-customer-${taxCode}-address').value,
        type: document.querySelector('input[name=\\"export-customer-${taxCode}-type\\"]:checked').value
      })">📤 Xuất hàng</button>
    </div>
  `;

  const container = document.getElementById(`${taxCode}-exportTabPlaceholder`);
  container.innerHTML = `
    <div id="${taxCode}-exportCustomerForm">${form}</div>
    <div id="${taxCode}-exportGoodsTable"></div>
  `;

  renderExportGoodsTable(taxCode, list);
}

function updateExportQty(taxCode, index, value) {
  const list = hkdData[taxCode].tempExportList;
  if (!list) return;
  list[index].exportQty = parseFloat(value) || 0;
  renderExportGoodsTable(taxCode, list);
}

function updateSellPrice(taxCode, index, value) {
  const list = hkdData[taxCode].tempExportList;
  if (!list) return;
  list[index].sellPrice = parseFloat(value) || 0;
  renderExportGoodsTable(taxCode, list);
}

// 📌 Gợi ý gắn vào nút "📤 Xuất hàng" với info:
// const info = { name: 'Nguyễn Văn A', mst: '123456789', phone: '0901234567', address: 'Hà Nội' };
// submitExportGoods('4500673836', currentExportList, info);
// Ví dụ tích hợp trong ô nhập % lợi nhuận:
// <input type="number" onchange="updateSellPricesByProfit('4500673836', this.value)" placeholder="% lợi nhuận">
