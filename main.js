async function handleFiles() {
  const input = document.getElementById("zipFile");
  const files = Array.from(input.files);
  if (!files.length) {
    toast("❌ Không có file nào được chọn", 3000);
    return;
  }

  for (const file of files) {
    if (!file.name.endsWith('.zip')) continue;

    let invoice;
    try {
      invoice = await extractInvoiceFromZip(file);
    } catch (err) {
      console.error("❌ Lỗi khi trích xuất XML:", err);
      toast(`❌ Không thể đọc hóa đơn từ file: ${file.name}`, 3000);
      continue;
    }

    // ✅ Kiểm tra và gán totals an toàn
    const totals = invoice?.totals || {};
    const hasTotals = ['beforeTax', 'tax', 'discount', 'total'].some(k => typeof totals[k] === 'number' && !isNaN(totals[k]));

    if (!hasTotals) {
      console.warn("⚠️ Hóa đơn thiếu dữ liệu tổng:", invoice);
      toast(`⚠️ Hóa đơn thiếu totals - bỏ qua file ${file.name}`, 3000);
      continue;
    }

    // Gán dữ liệu tổng
    invoice.totalBeforeTax = parseFloat(totals.beforeTax) || 0;
    invoice.totalTax = parseFloat(totals.tax) || 0;
    invoice.totalFee = parseFloat(totals.fee) || 0;
    invoice.discount = parseFloat(totals.discount) || 0;
    invoice.total = parseFloat(totals.total) || (invoice.totalBeforeTax + invoice.totalTax);

    // Gán thông tin mã số thuế + tên
    const taxCode = invoice?.buyerInfo?.taxCode?.trim() || 'UNKNOWN';
    const name = invoice?.buyerInfo?.name?.trim() || taxCode;
    const mccqt = (invoice.invoiceInfo?.mccqt || '').toUpperCase();

    // Kiểm tra trùng MCCQT
    const exists = (hkdData[taxCode]?.invoices || []).some(
      inv => (inv.invoiceInfo?.mccqt || '') === mccqt
    );
    if (exists) {
      toast(`⚠️ Bỏ qua MCCQT trùng: ${mccqt}`, 3000);
      continue;
    }

    // Nếu chưa có HKD, khởi tạo
    if (!hkdData[taxCode]) {
      hkdData[taxCode] = {
        name,
        tonkhoMain: [],
        tonkhoCK: [],
        tonkhoKM: [],
        invoices: [],
        exports: [],
        customers: []
      };
      hkdOrder.push(taxCode);
    } else if (!hkdData[taxCode].name) {
      hkdData[taxCode].name = name;
    }

    // ✅ Đưa vào danh sách hóa đơn
    hkdData[taxCode].invoices.push(invoice);

    // ✅ Phân bổ vào từng loại kho
    invoice.products.forEach(p => {
      const entry = JSON.parse(JSON.stringify(p));
      const arr =
        entry.category === 'hang_hoa' ? 'tonkhoMain' :
        entry.category === 'KM' ? 'tonkhoKM' : 'tonkhoCK';
      hkdData[taxCode][arr].push(entry);
    });

    logAction(`📥 Đã nhập hóa đơn ${invoice.invoiceInfo.number}`, JSON.parse(JSON.stringify(hkdData)));
  }

  // ✅ Lưu và render
  saveDataToLocalStorage();
  renderHKDList();
  if (hkdOrder.length > 0) {
    renderHKDTab(hkdOrder[hkdOrder.length - 1]);
  }

  toast('✅ Đã nhập xong hóa đơn', 2000);
}
async function extractInvoiceFromZip(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const xmlFile = Object.values(zip.files).find(f => f.name.endsWith('.xml'));
    if (!xmlFile) throw new Error("Không tìm thấy file XML trong ZIP");
    const xmlContent = await xmlFile.async('text');
    const invoice = parseXmlInvoice(xmlContent);
    invoice._taxCode = invoice?.buyerInfo?.taxCode?.trim() || 'UNKNOWN';
    return invoice;
}

// Hiển thị danh sách HKD
function renderHKDList() {
    const ul = document.getElementById('businessList');
    if (!ul) return;

    ul.innerHTML = '';
    hkdOrder.forEach(taxCode => {
        const li = document.createElement('li');
        li.textContent = taxCode;
        li.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
    `;
        li.addEventListener('click', () => renderHKDTab(taxCode));
        ul.appendChild(li);
    });
}



// customerManager.js - FULL CHỨC NĂNG (cập nhật popup đầy đủ thông tin KH + chỉnh sửa dòng hàng xuất)

// main.js

function renderHKDTab(taxCode) {
  ensureHkdData(taxCode);
  const hkd = hkdData[taxCode];
  const name = hkd.name || taxCode;
  const from = '';
  const to = '';
  const f = from || 'đầu kỳ';
  const t = to || 'hiện tại';

  const filteredInvoices = hkd.invoices || [];
  const filteredExports = hkd.exports || [];

  let totalInvoiceAmount = 0;
  let totalInvoiceTax = 0;
  let totalInvoiceFee = 0;
  let totalInvoiceDiscount = 0;

  // ✅ Dùng dữ liệu đã gán sẵn từ parseXmlInvoice
  for (const inv of filteredInvoices) {
    totalInvoiceAmount += inv.totalBeforeTax || 0;
    totalInvoiceTax += inv.totalTax || 0;
    totalInvoiceFee += inv.totalFee || 0;
    totalInvoiceDiscount += inv.discount || 0;
  }

  const totalExportRevenue = filteredExports.reduce((sum, ex) => sum + (ex.total || 0), 0);

  const totalHang = hkd.tonkhoMain.reduce((s, i) => s + (i.amount || 0), 0);
  const totalCK = hkd.tonkhoCK.reduce((s, i) => s + (i.amount || 0), 0);
  const totalAmountMain = totalHang - Math.abs(totalCK);

  let totalCost = 0;
  for (const ex of filteredExports) {
    for (const line of ex.items || []) {
      const cost = (parseFloat(line.priceInput) || 0) * (parseFloat(line.qty) || 0);
      totalCost += cost;
    }
  }

  const totalProfit = totalExportRevenue - totalCost;

  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <h2 style="font-size:25px; font-weight:bold; color:red; margin:10px 0;">🧾 ${name}</h2>
    <div style="margin-bottom:12px;">
      📅 Đang lọc từ <b>${f}</b> đến <b>${t}</b>: ${filteredInvoices.length} hóa đơn, ${filteredExports.length} lần xuất hàng
    </div>

    <div class="hkd-summary-grid hkd-section">
      <div class="summary-box"><div class="label">📥 Tổng HĐ đầu vào</div>
    <div class="value" id="${taxCode}-invoice-count">${filteredInvoices.length}</div>
  </div>

  <div class="summary-box"><div class="label">🧾 Tổng HDST đã T.Toán</div>
    <div class="value" id="${taxCode}-summary-total">${formatCurrency(totalInvoiceAmount)}</div>
  </div>

  <div class="summary-box"><div class="label">💸 Thuế GTGT đã trả</div>
    <div class="value" id="${taxCode}-summary-tax">${formatCurrency(totalInvoiceTax)}</div>
  </div>

  <div class="summary-box"><div class="label">📦 Phí</div>
    <div class="value" id="${taxCode}-summary-fee">${formatCurrency(totalInvoiceFee)}</div>
  </div>

  <div class="summary-box"><div class="label">🎁 Chiết khấu</div>
    <div class="value" id="${taxCode}-summary-discount">${formatCurrency(totalInvoiceDiscount)}</div>
  </div>

  <div class="summary-box"><div class="label">📤 Tổng HĐ xuất hàng</div>
    <div class="value" id="${taxCode}-export-count">${filteredExports.length}</div>
  </div>

  <div class="summary-box"><div class="label">📤 Tổng tiền xuất hàng</div>
    <div class="value" id="${taxCode}-export-amount">${formatCurrency(totalExportRevenue)}</div>
  </div>

  <div class="summary-box"><div class="label">📈 Tổng lợi nhuận tạm tính</div>
    <div class="value" id="${taxCode}-export-profit">${formatCurrency(totalProfit)}</div>
  </div>

  <div class="summary-box"><div class="label">💼 Tổng tồn kho hiện tại (Chưa thuế)</div>
    <div class="value" id="${taxCode}-summary-totalAmount">${formatCurrency(totalAmount)}</div>
  </div>

    <!-- Tabs và nội dung tab giữ nguyên -->

    <div class="tabs">
      <div class="tab active" onclick="openTab(event, '${taxCode}-tonkho')">📦 Tồn kho</div>
      <div class="tab" onclick="openTab(event, '${taxCode}-qlyhoadon')">📥 Quản lý Hóa đơn đầu vào</div>
      <div class="tab" onclick="openTab(event, '${taxCode}-xuathang')">📤 Xuất hàng hóa</div>
      <div class="tab" onclick="openTab(event, '${taxCode}-lichsu')">📜 Lịch sử xuất hàng</div>
      <div class="tab" onclick="openTab(event, '${taxCode}-quanlykh')">👥 Quản lý KH</div>
    </div>

    <div id="${taxCode}-tonkho" class="tab-content active hkd-section">
      <div class="tonkho-tab-buttons">
        <button onclick="switchTonKhoTab('main')">📦 Hàng hóa</button>
        <button onclick="switchTonKhoTab('km')">🎁 Khuyến mại</button>
        <button onclick="switchTonKhoTab('ck')">🔻 Chiết khấu</button>
        <div><button onclick="exportAllInventoryToExcel('${taxCode}')">📥 Xuất Excel toàn bộ</button></div>
      </div>
      <div style="margin-top:20px">
        <div id="tonKho-main"></div>
        <div id="tonKho-km" style="display:none;"></div>
        <div id="tonKho-ck" style="display:none;"></div>
      </div>
    </div>

    <div id="${taxCode}-qlyhoadon" class="tab-content hkd-section" style="display:none;">
      <div id="${taxCode}-invoiceTablePlaceholder"></div>
    </div>

    <div id="${taxCode}-xuathang" class="tab-content hkd-section" style="display:none;">
      <div id="${taxCode}-exportTabPlaceholder"></div>
    </div>

    <div id="${taxCode}-lichsu" class="tab-content hkd-section" style="display:none;">
      <h4>📜 Lịch sử xuất hàng</h4>
      <div id="${taxCode}-exportHistoryTable"></div>
    </div>

    <div id="${taxCode}-quanlykh" class="tab-content hkd-section" style="display:none;">
      <div id="${taxCode}-customerTabPlaceholder"></div>
    </div>
  `;

  renderTonKhoTab(taxCode, 'main');
  renderInvoiceTab(taxCode);
  renderExportGoodsTab(taxCode);
  renderExportHistoryTable(taxCode);

  const khContainer = document.getElementById(`${taxCode}-customerTabPlaceholder`);
  if (khContainer) {
    khContainer.innerHTML = `<div id="customerManagerContainer"></div>`;
  }
  renderCustomerTab(taxCode);
}

function renderCustomerTab(taxCode) {
    const container = document.getElementById('customerManagerContainer');
    const list = hkdData[taxCode].customers  || [];

    let html = `
    <h3>👥 Danh sách khách hàng</h3>
    <table border="1" cellpadding="4" cellspacing="0" style="width:100%; background:#fff;">
      <thead>
        <tr>
          <th>Tên KH</th><th>Địa chỉ</th><th>Điện thoại</th><th>MST</th><th>Loại</th>
          <th>HĐ</th><th>Doanh thu</th><th>Lợi nhuận</th><th>Chức năng</th>
        </tr>
      </thead>
      <tbody>
  `;

    let totalRevenue = 0, totalProfit = 0;

    list.forEach((kh, index) => {
        const invoices = kh.history || [];
        const revenue = invoices.reduce((sum, h) => sum + (h.total || 0), 0);
        const profit = invoices.reduce((sum, h) => {
            return sum + (h.items || []).reduce((s, i) => s + ((i.sellPrice - i.costPrice) * i.exportQty), 0);
        }, 0);

        totalRevenue += revenue;
        totalProfit += profit;

        html += `
      <tr>
        <td>${kh.name}</td>
        <td>${kh.address || ''}</td>
        <td>${kh.phone || ''}</td>
        <td>${kh.taxCodeInput || ''}</td>
        <td>${kh.type}</td>
        <td>${invoices.length}</td>
        <td>${revenue.toLocaleString()} đ</td>
        <td>${profit.toLocaleString()} đ</td>
        <td>
          <button onclick="showCustomerHistory('${taxCode}', customers['${taxCode}'][${index}])">📜</button>
          ${kh.type === 'ho_kinh_doanh' ? `<button onclick="editCustomer('${taxCode}', ${index})">✏️</button>` : ''}
          ${kh.type === 'ho_kinh_doanh' ? `<button onclick="deleteCustomer('${taxCode}', ${index})">🗑️</button>` : ''}
        </td>
      </tr>
    `;
    });

    html += `</tbody></table>
    <div style="margin-top:8px;">
      <b>📊 Tổng doanh thu:</b> ${totalRevenue.toLocaleString()} đ<br>
      <b>📈 Tổng lợi nhuận:</b> ${totalProfit.toLocaleString()} đ
    </div>
  `;

    container.innerHTML = html;
}




function renderCustomerTab(taxCode) {
    const container = document.getElementById("customerManagerContainer");
    if (!container) return;

    const list = (hkdData[taxCode].customers  || []).map((c, i) => {
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

        <td><button onclick="showCustomerHistory('${taxCode}', customers['${taxCode}'][${i}])">📜</button>
</td>
      </tr>
    `;
    }).join("");

    container.innerHTML = `
    <h3>👥 Danh sách khách hàng (${hkdData[taxCode].customers ?.length || 0})</h3>
    <table class="table">
      <tr>
        <th>Tên</th><th>SĐT</th><th>MST</th><th>Địa chỉ</th><th>Loại</th>
        <th>SL hóa đơn</th><th>Doanh thu</th><th>Lợi nhuận</th><th colspan=2>Thao tác</th>
      </tr>
      ${list}
    </table>
  `;
}
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  const tabEl = document.getElementById(`${tabName}-tab`);
  if (tabEl) tabEl.style.display = 'block';
}

function formatCurrencyVN(value, round = false) {
  if (typeof value !== 'number') value = parseFloat(value) || 0;
  if (round) value = Math.round(value / 1000) * 1000;
  return value.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function openTab(evt, tabId) {
  document.querySelectorAll(".tab-content").forEach(el => {
    if (el) el.style.display = "none";
  });

  document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));

  const target = document.getElementById(tabId);
  if (target) {
    target.style.display = "block";
  } else {
    showToast(`❌ Không tìm thấy tab ${tabId}`, 3000, 'error');
    return;
  }

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
    renderExportGoodsTab(taxCode); // Đảm bảo gọi từ exportGoodsTab.js
  } else if (tabId.includes('lichsu')) {
    renderExportHistoryTable(taxCode);
  } else if (tabId.includes('quanlykh')) {
    renderCustomerTab(taxCode);
  }
}

function initApp() {
  if (window.innerWidth < 768) {
    document.body.classList.add('compact-mode');
  }

  loadDataFromLocalStorage();
  renderHKDList();

  // Gắn các hàm vào window
  window.handleFiles = handleFiles;
  window.renderHKDTab = renderHKDTab;
  window.renderTonKhoTab = renderTonKhoTab;
  window.startEditProduct = startEditProduct;
  window.confirmEditProduct = confirmEditProduct;
  window.cancelEditProduct = cancelEditProduct;
  window.createTonKhoItem = createTonKhoItem;
  window.deleteTonKhoItem = deleteTonKhoItem;
  window.moveTonKhoItem = moveTonKhoItem;
  window.openExportPopup = openExportPopup;
  window.closeExportPopup = closeExportPopup;
  window.downloadInventoryExcel = downloadInventoryExcel;
  window.clearAll = clearAll;
  window.showLogHistory = showLogHistory;
  window.undoAction = undoAction;
  window.openTab = openTab;
  window.switchTonKhoTab = switchTonKhoTab;
  window.renderExportGoodsTab = renderExportGoodsTab;
  window.renderInvoiceTab = renderInvoiceTab;
  window.openInvoiceViewer = openInvoiceViewer;
  window.navigateInvoice = navigateInvoice;
  window.deleteInvoice = deleteInvoice;
  if (typeof closeInvoicePopup !== 'undefined') {
    window.closeInvoicePopup = closeInvoicePopup;
  } else {
    console.warn('closeInvoicePopup is not defined. Ensure invoiceTab.js is loaded.');
  }
  window.formatCurrencyVN = function(number, options = {}) {
    if (typeof number !== 'number') number = parseFloat(number) || 0;
    const { decimal = true, roundTo1000 = false } = options;
    if (roundTo1000) number = Math.ceil(number / 1000) * 1000;
    return number.toLocaleString('vi-VN', {
      minimumFractionDigits: decimal ? 2 : 0,
      maximumFractionDigits: decimal ? 2 : 0
    });
  };
}

document.addEventListener('DOMContentLoaded', initApp);

async function extractInvoiceFromZip(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const xmlFile = Object.values(zip.files).find(f => f.name.endsWith('.xml'));
    if (!xmlFile) throw new Error("Không tìm thấy file XML trong ZIP");
    const xmlContent = await xmlFile.async('text');
    const invoice = parseXmlInvoice(xmlContent);
    invoice._taxCode = invoice?.buyerInfo?.taxCode?.trim() || 'UNKNOWN';
    return invoice;
}

function renderHKDList() {
    const ul = document.getElementById('businessList');
    if (!ul) return;

    ul.innerHTML = '';
    hkdOrder.forEach(taxCode => {
        const hkd = hkdData[taxCode] || {};
        const name = hkd.name || taxCode;

        const li = document.createElement('li');
        li.classList.add('hkd-item');
        li.innerHTML = `
      <div><strong>${taxCode}</strong></div>
      <div class="hkd-name">${name}</div>
    `;
        li.onclick = () => {
            currentTaxCode = taxCode;
            renderHKDTab(taxCode);
        };
        ul.appendChild(li);
    });

    // Tự động chọn HKD đầu tiên nếu chưa có currentTaxCode
    if (hkdOrder.length > 0 && !currentTaxCode) {
        currentTaxCode = hkdOrder[0];
        renderHKDTab(currentTaxCode);
    }
}
function initApp() {
    if (window.innerWidth < 768) {
        document.body.classList.add('compact-mode');
    }

    loadDataFromLocalStorage(); // 🔴 Đọc từ localStorage
    renderHKDList();

    // Gắn các hàm vào window để toàn hệ thống dùng được
    window.handleFiles = handleFiles;
    window.renderHKDTab = renderHKDTab;
    window.renderTonKhoTab = renderTonKhoTab;
    window.startEditProduct = startEditProduct;
    window.confirmEditProduct = confirmEditProduct;
    window.cancelEditProduct = cancelEditProduct;
    window.createTonKhoItem = createTonKhoItem;
    window.deleteTonKhoItem = deleteTonKhoItem;
    window.moveTonKhoItem = moveTonKhoItem;
    window.openExportPopup = openExportPopup;
    window.closeExportPopup = closeExportPopup;
    window.downloadInventoryExcel = downloadInventoryExcel;
    window.clearAll = clearAll;
    window.showLogHistory = showLogHistory;
    window.undoAction = undoAction;
    window.openTab = openTab;
    window.renderInvoiceTab = renderInvoiceTab;
    window.openInvoiceViewer = openInvoiceViewer;
    window.navigateInvoice = navigateInvoice;
    window.deleteInvoice = deleteInvoice;



    // ✅ Định nghĩa hàm formatCurrencyVN toàn cục
    window.formatCurrencyVN = function (number, options = {}) {
        if (typeof number !== 'number') number = parseFloat(number) || 0;

        const {
            decimal = true,     // Có hiển thị 2 số lẻ không
            roundTo1000 = false // Có làm tròn đến hàng nghìn không
        } = options;

        if (roundTo1000) number = Math.ceil(number / 1000) * 1000;

        return number.toLocaleString('vi-VN', {
            minimumFractionDigits: decimal ? 2 : 0,
            maximumFractionDigits: decimal ? 2 : 0
        });
    };
}

document.addEventListener('DOMContentLoaded', initApp);
