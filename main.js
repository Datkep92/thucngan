// main.js

async function handleFiles() {
  const input = document.getElementById("zipFile");
  const files = Array.from(input.files);

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      window.showToast(`⚠️ Bỏ qua file không phải .zip: ${file.name}`, 3000, 'info');
      continue;
    }

    try {
      const invoice = await extractInvoiceFromZip(file);

      if (!invoice || !invoice.buyerInfo || !invoice.products) {
        window.showToast(`❌ Không đọc được dữ liệu hóa đơn: ${file.name}`, 3000, 'error');
        continue;
      }

      const taxCode = invoice?.buyerInfo?.taxCode?.trim() || 'UNKNOWN';
      const name = invoice?.buyerInfo?.name?.trim() || taxCode;
      const mccqt = (invoice.invoiceInfo?.mccqt || '').toUpperCase();

      // Tránh MCCQT trùng lặp
      const exists = (hkdData[taxCode]?.invoices || []).some(
        inv => (inv.invoiceInfo?.mccqt || '') === mccqt
      );
      if (exists) {
        window.showToast(`⚠️ Bỏ qua MCCQT trùng: ${mccqt}`, 3000, 'info');
        continue;
      }

      // Tạo mới nếu chưa có HKD
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

      // Lưu hóa đơn gốc
      hkdData[taxCode].invoices.push(invoice);

      // Gán sản phẩm từ invoice → tồn kho phù hợp
     invoice.products.forEach(p => {
  const entry = {
    ...p,
    lineDiscount: parseFloat(p.lineDiscount || 0),
    invoiceDate: invoice.invoiceInfo?.date || '',
    mccqt: invoice.invoiceInfo?.mccqt || ''
  };
  const arr = entry.category === 'hang_hoa' ? 'tonkhoMain' :
              entry.category === 'KM' ? 'tonkhoKM' : 'tonkhoCK';
  hkdData[taxCode][arr].push(entry);
});





      // ✅ Ghi log sau khi xử lý
      window.logAction(`✅ Nhập xong hóa đơn ${invoice.invoiceInfo.number}`, JSON.parse(JSON.stringify(hkdData)));

    } catch (err) {
      console.error(`❌ Lỗi xử lý file ${file.name}:`, err);
      window.showToast(`❌ File lỗi: ${file.name} - ${err.message}`, 3000, 'error');
      continue;
    }
  }

  // ✅ Gọi lại sau khi xử lý tất cả file
  window.saveDataToLocalStorage();
  window.renderHKDList();

  if (hkdOrder.length > 0) {
    window.renderHKDTab(hkdOrder[hkdOrder.length - 1]);
  }

  window.showToast('✅ Đã xử lý xong tất cả file hóa đơn', 2000, 'success');
}


async function extractInvoiceFromZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);

  const xmlFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.xml'));
  const htmlFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.html'));

  if (!xmlFile) throw new Error("Không tìm thấy file XML trong ZIP");

  const xmlContent = await xmlFile.async('text');
  const invoice = parseXmlInvoice(xmlContent);
  invoice._taxCode = invoice?.buyerInfo?.taxCode?.trim() || 'UNKNOWN';

  // Nếu có file HTML thì lưu vào localStorage (hoặc tạo Blob URL)
  if (htmlFile) {
    const htmlContent = await htmlFile.async('text');
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(blob);
    invoice.htmlUrl = htmlUrl; // gắn vào hóa đơn để hiển thị sau
  }

  return invoice;
}

function renderHKDList() {
  const ul = document.getElementById('businessList');
  if (!ul) return;

  ul.innerHTML = '';

  hkdOrder.forEach(taxCode => {
    const hkd = hkdData[taxCode] || {};
    const name = hkd.name || taxCode;
    const invoices = hkd.invoices || [];

    const mccqtList = invoices
      .map(inv => ({
        date: inv.invoiceInfo?.date || '',
        mccqt: inv.invoiceInfo?.mccqt || ''
      }))
      .filter(x => x.mccqt)
      .sort((a, b) => (a.date > b.date ? -1 : 1));

    const li = document.createElement('li');
    li.classList.add('hkd-item');

    const idList = `mccqtList-${taxCode}`;

    li.innerHTML = `
      <div onclick="window.renderHKDTab('${taxCode}')">
        <strong>${taxCode}</strong><br>
        <span>${name}</span>
      </div>
      <button onclick="toggleInvoiceList('${taxCode}')">📄 Xem hóa đơn</button>
      <ul id="${idList}" style="display:none;">
        ${
          mccqtList.length
            ? mccqtList
                .map(
                  item => `
            <li onclick="openInvoicePopup('${taxCode}','${item.mccqt}')">
              ${item.date} – ${item.mccqt}
            </li>`
                )
                .join('')
            : `<li><i>Chưa có hóa đơn</i></li>`
        }
      </ul>
    `;

    ul.appendChild(li);
  });

  if (hkdOrder.length > 0 && !currentTaxCode) {
    currentTaxCode = hkdOrder[0];
    window.renderHKDTab(currentTaxCode);
  }
}


function renderHKDTab(taxCode) {
  currentTaxCode = taxCode;
  ensureHkdData(taxCode);
  const hkd = hkdData[taxCode];
  const name = hkd.name || taxCode;
  // ======= Danh sách MCCQT theo HKD =======
const mccqtList = (hkd.invoices || [])
  .map(inv => ({
    date: inv.invoiceInfo?.date || '',
    mccqt: inv.invoiceInfo?.mccqt || ''
  }))
  .filter(i => i.mccqt)
  .sort((a, b) => (a.date > b.date ? -1 : 1)); // sắp xếp mới nhất trước

let mccqtHtml = '<div id="mccqtListContainer" style="margin:8px 0;">';
if (mccqtList.length === 0) {
  mccqtHtml += '<i>Chưa có hóa đơn nào</i>';
} else {
  mccqtHtml += '<div style="font-weight:bold; margin-bottom:4px;">📅 Danh sách hóa đơn:</div>';
  mccqtHtml += `<ul style="list-style:none; padding:0; margin:0;">`;
  mccqtList.forEach(item => {
    mccqtHtml += `
      <li 
        onclick="renderInvoiceDetail('${taxCode}','${item.mccqt}')"
        style="cursor:pointer; padding:4px 8px; border-bottom:1px solid #eee;"
        onmouseover="this.style.background='#f0f0f0'"
        onmouseout="this.style.background='transparent'">
        ${item.date} – <b>${item.mccqt}</b>
      </li>`;
  });
  mccqtHtml += `</ul>`;
}
mccqtHtml += '</div>';

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

  for (const inv of filteredInvoices) {
    totalInvoiceAmount += inv.totals?.beforeTax || 0;
    totalInvoiceTax += inv.totals?.tax || 0;
    totalInvoiceFee += inv.totals?.fee || 0;
    totalInvoiceDiscount += inv.totals?.discount || 0;
  }

  const totalExportRevenue = filteredExports.reduce((sum, ex) => sum + (ex.total || 0), 0);

  const totalHang = hkd.tonkhoMain.reduce((s, i) => s + (i.amount || 0), 0);
  const totalCK = hkd.tonkhoCK.reduce((s, i) => s + (i.amount || 0), 0);
  const totalAmountMain = totalHang - Math.abs(totalCK);

  let totalCost = 0;
  for (const ex of filteredExports) {
    for (const line of ex.items || []) {
      const cost = (parseFloat(line.priceInput) || parseFloat(line.price) || 0) * (parseFloat(line.qty) || 0);
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
      <div class="summary-box"><div class="label">📥 Tổng HĐ đầu vào</div><div class="value">${window.formatCurrencyVN(filteredInvoices.length, { decimal: false })}</div></div>
      <div class="summary-box"><div class="label">🧾 Tổng HDST đã T.Toán</div><div class="value">${window.formatCurrencyVN(totalInvoiceAmount)}</div></div>
      <div class="summary-box"><div class="label">💸 Thuế GTGT đã trả</div><div class="value">${window.formatCurrencyVN(totalInvoiceTax)}</div></div>
      <div class="summary-box"><div class="label">📦 Phí</div><div class="value">${window.formatCurrencyVN(totalInvoiceFee)}</div></div>
      <div class="summary-box"><div class="label">🎁 Chiết khấu</div><div class="value">${window.formatCurrencyVN(totalInvoiceDiscount)}</div></div>
       </div>

   <div class="tabs">
  <div class="tab active" onclick="openTab(event, '${taxCode}-tonkho')">📦 Tồn kho</div>
</div>

<div id="${taxCode}-tonkho" class="tab-content active hkd-section">
  <div class="tonkho-tab-buttons"
       style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; background: #f8f8f8; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
    
    <!-- ✅ Nhóm nút chuyển tab -->
    <div style="display: flex; gap: 10px;">
      <button onclick="switchTonKhoTab('main')">📦 Hàng hóa</button>
      <button onclick="switchTonKhoTab('km')">🎁 Khuyến mại</button>
      <button onclick="switchTonKhoTab('ck')">🔻 Chiết khấu</button>
    </div>
    
    <!-- ✅ Nút xuất Excel nằm cùng hàng, sang phải -->
    <button onclick="exportAllInventoryToExcel('${taxCode}')">📥 Xuất Excel toàn bộ</button>
  </div>

  <div style="margin-top:20px">
    <div id="tonKho-main"></div>
    <div id="tonKho-km" style="display:none;"></div>
    <div id="tonKho-ck" style="display:none;"></div>
  </div>
</div>



   
  `;

  if (typeof window.renderTonKhoTab === 'function') {
    window.renderTonKhoTab(taxCode, 'main');
  } else {
    console.error('renderTonKhoTab is not defined. Ensure inventory.js is loaded correctly.');
    document.getElementById('tonKho-main').innerHTML = '<div>❌ Lỗi: Không thể hiển thị tab tồn kho.</div>';
  }

  if (typeof window.renderInvoiceTab === 'function') {
    window.renderInvoiceTab(taxCode);
  } else {
    console.error('renderInvoiceTab is not defined. Ensure invoiceTab.js is loaded correctly.');
    document.getElementById(`${taxCode}-invoiceTablePlaceholder`).innerHTML = '<div>❌ Lỗi: Không thể hiển thị tab hóa đơn.</div>';
  }

  if (typeof window.renderExportGoodsTab === 'function') {
    window.renderExportGoodsTab(taxCode);
  } else {
    console.error('renderExportGoodsTab is not defined. Ensure exportGoodsTab.js is loaded correctly.');
    document.getElementById(`${taxCode}-exportTabPlaceholder`).innerHTML = '<div>❌ Lỗi: Không thể hiển thị tab xuất hàng.</div>';
  }

  if (typeof window.renderExportHistoryTable === 'function') {
    window.renderExportHistoryTable(taxCode);
  } else {
    console.error('renderExportHistoryTable is not defined. Ensure export.js is loaded correctly.');
    document.getElementById(`${taxCode}-exportHistoryTable`).innerHTML = '<div>❌ Lỗi: Không thể hiển thị lịch sử xuất hàng.</div>';
  }

  if (typeof window.renderCustomerTab === 'function') {
    window.renderCustomerTab(taxCode);
  } else {
    console.error('renderCustomerTab is not defined. Ensure exportGoodsTab.js is loaded correctly.');
    document.getElementById('customerManagerContainer').innerHTML = '<div>❌ Lỗi: Không thể hiển thị tab quản lý khách hàng. Vui lòng kiểm tra file exportGoodsTab.js.</div>';
  }
}
function renderInvoiceDetail(taxCode, mccqt) {
  const hkd = hkdData[taxCode];
  if (!hkd || !Array.isArray(hkd.invoices)) return;

  const invoice = hkd.invoices.find(inv => inv.invoiceInfo?.mccqt === mccqt);
  if (!invoice) {
    showToast(`❌ Không tìm thấy hóa đơn ${mccqt}`, 2000, 'error');
    return;
  }

  const products = invoice.products || [];
  let html = `
    <h3 style="margin-top:10px;">📦 Bảng kê hóa đơn: ${mccqt}</h3>
    <div style="margin-bottom:8px; color:#555;">Ngày lập: ${invoice.invoiceInfo?.date || 'Không rõ'}</div>
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%; background:#fff;">
      <thead>
        <tr>
          <th>STT</th><th>Mã SP</th><th>Tên hàng</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>CK</th><th>Thành tiền</th><th>Thuế</th>
        </tr>
      </thead>
      <tbody>`;

  products.forEach((p, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.code || ''}</td>
        <td>${p.name || ''}</td>
        <td>${p.unit || ''}</td>
        <td>${p.quantity}</td>
        <td>${p.price}</td>
        <td>${p.discount}</td>
        <td>${p.amount.toLocaleString()}</td>
        <td>${p.taxRate}%</td>
      </tr>`;
  });

  html += `</tbody></table>`;

  // Hiển thị popup chi tiết
  window.showPopup(html, `Chi tiết hóa đơn ${mccqt}`);
}

function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  const tabEl = document.getElementById(`${tabName}-tab`);
  if (tabEl) tabEl.style.display = 'block';
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
    window.showToast(`❌ Không tìm thấy tab ${tabId}`, 3000, 'error');
    return;
  }

  if (evt?.currentTarget) evt.currentTarget.classList.add("active");

  const taxCode = tabId.split('-')[0];
  if (taxCode) {
    window.clearEventListeners(taxCode);
    if (!tabId.includes('xuathang')) {
      window.clearTempExportData(taxCode);
    }
  }

  if (tabId.includes('tonkho')) {
    window.renderTonKhoTab(taxCode, 'main');
  } else if (tabId.includes('qlyhoadon')) {
    window.renderInvoiceTab(taxCode);
  } else if (tabId.includes('xuathang')) {
    window.renderExportGoodsTab(taxCode);
  } else if (tabId.includes('lichsu')) {
    window.renderExportHistoryTable(taxCode);
  } else if (tabId.includes('quanlykh')) {
    window.renderCustomerTab(taxCode);
  }
}

function initApp() {
  if (window.innerWidth < 768) {
    document.body.classList.add('compact-mode');
  }

  window.loadDataFromLocalStorage();
  window.renderHKDList();

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
}
window.showPopup = function(html, title = '', onClose = null) {
  const wrapper = document.createElement('div');
  wrapper.id = 'invoicePopupWrapper';
  wrapper.classList.add('popup-wrapper');

  wrapper.innerHTML = `
    <div class="popup">
      <div class="popup-header">
        <div class="popup-title">${title}</div>
        <button onclick="window.closeInvoicePopup()" class="close-btn">❌</button>
      </div>
      <div class="popup-body">${html}</div>
      <div class="popup-footer" style="text-align:right; margin-top:8px;">
        <button onclick="window.closeInvoicePopup()">Đóng</button>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  // Đóng popup logic
  window.closeInvoicePopup = function () {
    wrapper.remove();
    if (typeof onClose === 'function') onClose();
  };
};
function openInvoicePopup(taxCode, mccqt) {
  const hkd = hkdData[taxCode];
  if (!hkd) return;

  const invoice = (hkd.invoices || []).find(inv => inv.invoiceInfo?.mccqt === mccqt);
  if (!invoice) {
    showToast(`❌ Không tìm thấy hóa đơn ${mccqt}`, 2000, 'error');
    return;
  }

  const products = invoice.products || [];
  let html = `
    <div style="padding:20px; max-height:70vh; overflow:auto;">
      <h2 style="margin-bottom:10px;">🧾 Hóa đơn: ${mccqt}</h2>
      <div style="color:#555; margin-bottom:12px;">Ngày lập: ${invoice.invoiceInfo?.date || 'Không rõ'}</div>
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; background:#fff; border-collapse:collapse;">
        <thead style="background:#f9f9f9;">
          <tr>
            <th>STT</th><th>Mã SP</th><th>Tên hàng</th><th>ĐVT</th>
            <th>SL</th><th>Đơn giá</th><th>CK</th><th>Thành tiền</th><th>Thuế (%)</th>
          </tr>
        </thead>
        <tbody>
  `;

  products.forEach((p, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.code || ''}</td>
        <td>${p.name || ''}</td>
        <td>${p.unit || ''}</td>
        <td>${p.quantity}</td>
        <td>${p.price}</td>
        <td>${p.discount}</td>
        <td>${(p.amount || 0).toLocaleString()}</td>
        <td>${p.taxRate}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Tạo popup
  let popup = document.createElement('div');
  popup.id = 'invoicePopup';
  popup.style.cssText = `
    position: fixed;
    top: 10%;
    left: 10%;
    width: 80%;
    height: 80%;
    background: white;
    border-radius: 10px;
    box-shadow: 0 0 20px rgba(0,0,0,0.4);
    z-index: 9999;
    display: flex;
    flex-direction: column;
  `;

  popup.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; background:#f44336; color:white; padding:10px 16px; border-top-left-radius:10px; border-top-right-radius:10px;">
      <div style="font-size:18px;">Chi tiết hóa đơn ${mccqt}</div>
      <button onclick="closeInvoicePopup()" style="background:white; color:#f44336; border:none; font-weight:bold; padding:4px 10px; border-radius:4px; cursor:pointer;">❌ Đóng</button>
    </div>
    <div style="flex:1; overflow:auto; padding:16px;">${html}</div>
  `;

  document.body.appendChild(popup);
}

function closeInvoicePopup() {
  const popup = document.getElementById('invoicePopup');
  if (popup) popup.remove();
}
function toggleInvoiceList(taxCode) {
  const list = document.getElementById(`mccqtList-${taxCode}`);
  if (!list) return;

  const isHidden = list.style.display === 'none' || !list.style.display;
  list.style.display = isHidden ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', initApp);