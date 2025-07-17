// 📁 main.js

// 📁 main.js

async function handleFiles() {
  const input = document.getElementById("zipFile");
  const files = Array.from(input.files);

  for (const file of files) {
    if (!file.name.endsWith('.zip')) continue;

    const invoice = await extractInvoiceFromZip(file);
    const taxCode = invoice?.buyerInfo?.taxCode?.trim() || 'UNKNOWN';
    const name = invoice?.buyerInfo?.name?.trim() || taxCode;
    const mccqt = (invoice.invoiceInfo?.mccqt || '').toUpperCase();

    const exists = (hkdData[taxCode]?.invoices || []).some(inv => (inv.invoiceInfo?.mccqt || '') === mccqt);
    if (exists) {
      toast(`⚠️ Bỏ qua MCCQT trùng: ${mccqt}`, 3000);
      continue;
    }

    if (!hkdData[taxCode]) {
      // Tạo mới HKD nếu chưa có
      hkdData[taxCode] = {
        name,
        tonkhoMain: [],
        tonkhoCK: [],
        tonkhoKM: [],
        invoices: [],
        exports: []
      };
      hkdOrder.push(taxCode);
    } else {
      // Nếu HKD đã có nhưng chưa có tên, thì bổ sung tên
      if (!hkdData[taxCode].name) {
        hkdData[taxCode].name = name;
      }
    }

    hkdData[taxCode].invoices.push(invoice);

    invoice.products.forEach(p => {
      const entry = JSON.parse(JSON.stringify(p));
      const arr = entry.category === 'hang_hoa' ? 'tonkhoMain' :
                  entry.category === 'KM' ? 'tonkhoKM' : 'tonkhoCK';
      hkdData[taxCode][arr].push(entry);
    });

    logAction(`Đã nhập hóa đơn ${invoice.invoiceInfo.number}`, JSON.parse(JSON.stringify(hkdData)));
  }

  saveDataToLocalStorage();
  renderHKDList();
// 👉 Hiển thị HKD vừa nhập cuối cùng (mới nhất)
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

function renderHKDList() {
  const ul = document.getElementById('businessList');
  ul.innerHTML = '';

  hkdOrder.forEach(taxCode => {
    const hkd = hkdData[taxCode];
    const name = hkd.name || taxCode;

    const li = document.createElement('li');
    li.classList.add('hkd-item');
    li.onclick = () => renderHKDTab(taxCode);
    li.innerHTML = `
      
      <div class="hkd-name">${name}</div>
<div><strong>${taxCode}</strong></div>
    `;
    ul.appendChild(li);
  });
}


function renderHKDTab(taxCode) {
  const hkd = hkdData[taxCode];
  currentTaxCode = taxCode;

const name = hkd.name || taxCode;
  const from = ''; // bộ lọc ngày có thể tích hợp sau
  const to = '';
  const f = from || 'đầu kỳ';
  const t = to || 'hiện tại';

  const filteredInvoices = hkd.invoices || [];
  const filteredExports = hkd.exports || [];

  const totalInvoiceAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.totalManual || 0), 0);
  const totalInvoiceTax = filteredInvoices.reduce((sum, inv) => sum + (inv.totalTax || 0), 0);
  const totalInvoiceFee = filteredInvoices.reduce((sum, inv) => sum + (inv.totalFee || 0), 0);
  const totalInvoiceDiscount = filteredInvoices.reduce((sum, inv) => sum + (inv.totalDiscount || 0), 0);
  const totalExportRevenue = filteredExports.reduce((sum, ex) => sum + (ex.total || 0), 0);

  const totalHang = hkd.tonkhoMain.reduce((s, i) => s + (i.amount || 0), 0);
  const totalCK = hkd.tonkhoCK.reduce((s, i) => s + (i.amount || 0), 0);
  const totalAmountMain = totalHang - Math.abs(totalCK);
  const totalProfit = totalExportRevenue - totalInvoiceAmount;
  mainContent.innerHTML = `
    <div class="hkd-wrapper">
      <div class="hkd-report-filters">
        <label>Từ ngày: <input type="date" id="reportFrom-${taxCode}" value="${from}"></label>
        <label>Đến ngày: <input type="date" id="reportTo-${taxCode}" value="${to}"></label>
        <button onclick="applyHKDReportFilter('${taxCode}')">📊 Áp dụng</button>
        <button onclick="resetHKDReport('${taxCode}')">🔄 Xem toàn bộ</button>
        <button onclick="printHKDSummary('${taxCode}')">🖨️ In báo cáo</button>
      </div>
      <h2 style="font-size:25px; font-weight:bold; color:red; margin:10px 0;">🧾 ${name}</h2>
      <div style="margin-bottom:12px;">
        📅 Đang lọc từ <b>${f}</b> đến <b>${t}</b>: ${filteredInvoices.length} hóa đơn, ${filteredExports.length} lần xuất hàng
      </div>
      <div class="hkd-summary-grid hkd-section">
        <div class="summary-box"><div class="label">📥 Tổng HĐ đầu vào</div><div class="value">${filteredInvoices.length}</div></div>
        <div class="summary-box"><div class="label">🧾 Tổng HDST đã T.Toán</div><div class="value">${formatCurrency(totalInvoiceAmount)}</div></div>
        <div class="summary-box"><div class="label">💸 Thuế GTGT đã trả</div><div class="value">${formatCurrency(totalInvoiceTax)}</div></div>
        <div class="summary-box"><div class="label">📦 Phí</div><div class="value">${formatCurrency(totalInvoiceFee)}</div></div>
        <div class="summary-box"><div class="label">🎁 Chiết khấu</div><div class="value">${formatCurrency(totalInvoiceDiscount)}</div></div>
        <div class="summary-box"><div class="label">📤 Tổng HĐ xuất hàng</div><div class="value">${filteredExports.length}</div></div>
        <div class="summary-box"><div class="label">📤 Tổng tiền xuất hàng</div><div class="value">${formatCurrency(totalExportRevenue)}</div></div>
        <div class="summary-box"><div class="label">📈 Tổng lợi nhuận tạm tính</div><div class="value">${formatCurrency(totalProfit)}</div></div>
        <div class="summary-box"><div class="label">💼 Tổng tồn kho hiện tại</div><div class="value">${formatCurrency(totalAmountMain)}</div></div>
      </div>
      <div class="tabs">
        <div class="tab active" onclick="openTab(event, '${taxCode}-tonkho')">📦 Tồn kho</div>
        <div class="tab" onclick="openTab(event, '${taxCode}-qlyhoadon')">📥 Quản lý Hóa đơn đầu vào</div>
        <div class="tab" onclick="openTab(event, '${taxCode}-xuathang')">📤 Xuất hàng hóa</div>
        <div class="tab" onclick="openTab(event, '${taxCode}-lichsu')">📜 Lịch sử xuất hàng</div>
      </div>
      <div id="${taxCode}-tonkho" class="tab-content active hkd-section">
                 <div class="tonkho-tab-buttons">
            <button onclick="switchTonKhoTab('main')">📦 Hàng hóa</button>
            <button onclick="switchTonKhoTab('km')">🎁 Khuyến mại</button>
            <button onclick="switchTonKhoTab('ck')">🔻 Chiết khấu</button>
 <div>
    <button onclick="exportAllInventoryToExcel('${taxCode}')">📥 Xuất Excel toàn bộ</button>
  </div>          </div>
<div style="margin-top:20px">
  <div id="tonKho-main"></div>
  <div id="tonKho-km" style="display:none;"></div>
  <div id="tonKho-ck" style="display:none;"></div>
</div>
      <div id="${taxCode}-qlyhoadon" class="tab-content hkd-section">
  <div id="${taxCode}-invoiceTablePlaceholder"></div>
</div>

      <div id="${taxCode}-xuathang" class="tab-content hkd-section">
<div id="${taxCode}-exportTabPlaceholder"></div>
        <div style="margin-top:20px;">

          <h4>📜 Lịch sử xuất hàng</h4>
          <div id="${taxCode}-exportHistoryTable"></div>
        </div>
      </div>
    </div>
  `;

  renderTonKhoTab(taxCode, 'main');
renderExportGoodsTab(taxCode); // <-- THÊM DÒNG NÀY
renderInvoiceTab(taxCode);
}

function openTab(event, tabId) {
  // Bỏ class 'active' khỏi tất cả tab header
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

  // Thêm class 'active' cho tab được click
  event.currentTarget.classList.add('active');

  

  // Hiện đúng tab-content tương ứng
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) selectedTab.style.display = 'block';

  // Nếu là tab hóa đơn thì render lại bảng
  if (tabId.endsWith('-qlyhoadon')) {
    const taxCode = tabId.replace('-qlyhoadon', '');
    console.log('📥 Mở tab hóa đơn của MST:', taxCode);
    renderInvoiceTab(taxCode);
  }
}







function initApp() {
  if (window.innerWidth < 768) {
    document.body.classList.add('compact-mode');
  }

  loadDataFromLocalStorage(); // 🔴 Đọc từ localStorage
  renderHKDList();

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
// ✅ Gắn vào window tab xuất hàng
window.renderExportGoodsTab = renderExportGoodsTab;

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
  ul.innerHTML = '';

  hkdOrder.forEach(taxCode => {
    const hkd = hkdData[taxCode];
    const name = hkd.name || taxCode;

    const li = document.createElement('li');
    li.classList.add('hkd-item');
    li.onclick = () => renderHKDTab(taxCode);
    li.innerHTML = `
      <div><strong>${taxCode}</strong></div>
      <div class="hkd-name">${name}</div>
    `;
    ul.appendChild(li);
  });
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
window.closeInvoicePopup = closeInvoicePopup;
window.navigateInvoice = navigateInvoice;
window.deleteInvoice = deleteInvoice;



  // ✅ Định nghĩa hàm formatCurrencyVN toàn cục
  window.formatCurrencyVN = function(number, options = {}) {
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
document.getElementById('myPopup').style.display = 'block';

document.addEventListener('DOMContentLoaded', initApp);
