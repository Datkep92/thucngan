// === BIẾN TOÀN CỤC CHO DRAG & DROP ===
// === TÌM KIẾM CẢ 2 CỘT ===
function filterBothColumns(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Hiện lại tất cả
    document.querySelectorAll('.match-item').forEach(item => {
      item.style.display = 'block';
    });
    return;
  }

  document.querySelectorAll('.match-item').forEach(item => {
    const searchText = item.dataset.search || '';
    const matches = searchText.includes(q);
    item.style.display = matches ? 'block' : 'none';
  });
}
function openMatchByDragPopup(taxCode) {
  currentTaxCode = taxCode;
  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.exports?.length) {
    window.showToast('Không có dữ liệu xuất hàng!', 2500, 'error');
    return;
  }

  let exportHtml = '';
  let stockHtml = '';

  // === XUẤT HÀNG CHƯA KHỚP ===
  hkd.exports.forEach((exp, expIdx) => {
    exp.items.forEach((item, itemIdx) => {
      const remainingQty = parseFloat(item.qty) || 0;
      if (remainingQty <= 0) return;

      // Giá có thể nằm trong item.price, nếu chưa có thì để 0
      const price = parseFloat(item.price) || 0;

      // === XUẤT HÀNG ===
// === XUẤT HÀNG ===
exportHtml += `
  <div class="match-item" 
       draggable="true"
       data-type="export"
       data-expidx="${expIdx}"
       data-itemidx="${itemIdx}"
       data-price="${price}"
       data-qty="${remainingQty}"
       data-search="${(item.name + ' ' + item.unit + ' ' + price).toLowerCase()}"
       ondragstart="dragStart(event)">
    <div><b>${item.name}</b></div>
    <div class="qty" style="color:#d32f2f;">SL: ${formatQuantity(remainingQty)} ${item.unit || ''}</div>
    <div class="price" style="font-size:0.85em; color:#1565c0;">
      Giá: ${window.formatCurrencyVN(price)}
    </div>
  </div>`;
    });
  });


  // === TỒN KHO CÒN HÀNG ===
  (hkd.tonkhoMain || []).forEach((stock, stockIdx) => {
    const qty = parseFloat(stock.quantity) || 0;
    if (qty <= 0) return;

    // === TỒN KHO ===
// === TỒN KHO ===
stockHtml += `
  <div class="match-item" 
       data-type="stock"
       data-stockidx="${stockIdx}"
       data-price="${stock.price}"
       data-qty="${qty}"
       data-search="${(stock.name + ' ' + stock.unit + ' ' + stock.price).toLowerCase()}"
       ondragover="allowDrop(event)"
       ondrop="drop(event)">
    <div><b>${stock.name}</b></div>
    <div class="qty">SL: ${formatQuantity(qty)} ${stock.unit || ''}</div>
    <div style="font-size:0.8em; color:#2e7d32;">Giá: ${window.formatCurrencyVN(stock.price)}</div>
  </div>`;
  });

  if (!exportHtml) exportHtml = '<p style="text-align:center; color:#999; padding:20px;">Tất cả đã khớp!</p>';
  if (!stockHtml) stockHtml = '<p style="text-align:center; color:#999; padding:20px;">Không còn tồn kho!</p>';

     const popupHtml = `
    <!-- THANH TÌM KIẾM CHUNG -->
    <div style="padding: 12px 16px; background: #f0f0f0; border-bottom: 1px solid #ddd; display: flex; align-items: center;">
      <input type="text" 
             id="globalSearchInput" 
             placeholder="Tìm kiếm trong cả 2 cột (tên, đơn vị, giá, mã hóa đơn...)" 
             style="flex:1; padding:10px 12px; font-size:1em; border:1px solid #ccc; border-radius:6px;"
             onkeyup="filterBothColumns(this.value)">
      <span style="margin-left:8px; color:#666; font-size:0.9em;">Tìm cả 2 bên</span>
    </div>

            <!-- THANH LỌC & SẮP XẾP -->
    <div style="padding:10px; background:#fafafa; border-bottom:1px solid #ddd; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
      <strong style="color:#1976d2;">📑 Bộ lọc:</strong>
      <button class="filter-btn" onclick="applyFilter('sort','az')">A–Z</button>
      <button class="filter-btn" onclick="applyFilter('sort','za')">Z–A</button>

      <span style="margin-left:10px; color:#666;">Đơn giá:</span>
      <button class="filter-btn" onclick="applyFilter('priceDiff','lt10')">&lt;10%</button>
      <button class="filter-btn" onclick="applyFilter('priceDiff','eq0')">=0%</button>
      <button class="filter-btn" onclick="applyFilter('priceDiff','lt15')">&lt;15%</button>

      <span style="margin-left:10px; color:#666;">Độ trùng tên:</span>
      <button class="filter-btn" onclick="applyFilter('fuzzy',0.4)">>40%</button>
      <button class="filter-btn" onclick="applyFilter('fuzzy',0.5)">>50%</button>
      <button class="filter-btn" onclick="applyFilter('fuzzy',0.6)">>60%</button>
      <button class="filter-btn" onclick="applyFilter('fuzzy',0.7)">>70%</button>
      <button class="filter-btn" onclick="applyFilter('fuzzy',0.8)">>80%</button>
      <button class="filter-btn" onclick="applyFilter('fuzzy',0.9)">>90%</button>
      <button class="filter-btn" onclick="applyFilter('fuzzy',1)">100%</button>

      <button class="filter-btn" onclick="resetFilters()" style="margin-left:auto; background:#ccc;">Xóa lọc</button>
    </div>

   <!-- HÀNG LỌC ĐƠN GIÁ -->
<div style="padding:8px 10px; background:#fdfdfd; border-bottom:1px solid #eee; display:flex; flex-wrap:wrap; align-items:center; gap:6px;">
  <span style="color:#444;">Lọc theo đơn giá:</span>
  <input type="number" id="priceValueInput" 
         placeholder="Nhập đơn giá (vd: 120000)" 
         style="width:160px; padding:6px 8px; border:1px solid #ccc; border-radius:4px;"
         oninput="handlePriceValueInput(this.value)">
  <span style="font-size:0.9em; color:#888;">(±15%)</span>

  <div style="margin-left:10px; display:flex; flex-wrap:wrap; gap:6px;">
  <!-- NÚT MỚI -->
  <button class="filter-btn" onclick="applyFilter('priceTarget',10000)">~10k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',50000)">~50k</button>

  <!-- NÚT CŨ -->
  <button class="filter-btn" onclick="applyFilter('priceTarget',100000)">~100k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',150000)">~150k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',200000)">~200k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',250000)">~250k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',300000)">~300k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',350000)">~350k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',400000)">~400k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',450000)">~450k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',500000)">~500k</button>

  <!-- NÚT MỚI -->
  <button class="filter-btn" onclick="applyFilter('priceTarget',700000)">~700k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',1000000)">~1000k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',2000000)">~2000k</button>
  <button class="filter-btn" onclick="applyFilter('priceTarget',3000000)">~5000k</button>
</div>
</div>



    <!-- KHU VỰC 2 CỘT -->
    <div class="match-content" 
         style="display:flex; gap:10px; padding:10px; background:#fff; overflow:hidden; height:70vh;">
      
      <!-- CỘT XUẤT HÀNG -->
      <div class="match-column" 
           style="flex:1; display:flex; flex-direction:column; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
        <h4 style="background:#e3f2fd; padding:10px; margin:0; border-bottom:1px solid #ccc;">Xuất Hàng (Chưa Khớp)</h4>
        <div id="exportItemsList" 
             class="match-list" 
             style="flex:1; overflow-y:auto; padding:8px 10px;">
          ${exportHtml}
        </div>
      </div>

      <!-- MŨI TÊN -->
      <div class="match-arrow" 
           style="display:flex; align-items:center; justify-content:center; width:40px; font-size:2em; color:#1976d2;">
        →
      </div>

      <!-- CỘT TỒN KHO -->
      <div class="match-column" 
           style="flex:1; display:flex; flex-direction:column; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
        <h4 style="background:#e8f5e9; padding:10px; margin:0; border-bottom:1px solid #ccc;">Tồn Kho (Còn Hàng)</h4>
        <div id="stockItemsList" 
             class="match-list" 
             style="flex:1; overflow-y:auto; padding:8px 10px;">
          ${stockHtml}
        </div>
      </div>
    </div>

    <!-- CHÂN POPUP -->
    <div class="popup-footer" style="padding:16px; text-align:right; border-top:1px solid #eee; background:#f9f9f9;">
      <button onclick="confirmAllMatches()" 
              style="padding:10px 20px; background:#1976d2; color:white; border:none; border-radius:6px; cursor:pointer; margin-left:8px;">
        Xác Nhận Tất Cả
      </button>
      <button onclick="closeMatchPopup()" 
              style="padding:10px 20px; background:#ccc; color:black; border:none; border-radius:6px; cursor:pointer;">
        Hủy
      </button>
    </div>
  `;


// === TRONG openMatchByDragPopup() ===
window.showPopup(popupHtml, 'Khớp Tồn Kho - Kéo Thả', () => {
  currentTaxCode = '';
});

// ĐỢI DOM ĐƯỢC RENDER HOÀN TẤT → MỚI CACHE
setTimeout(() => {
  document.getElementById('globalSearchInput')?.focus();

  // BƯỚC 1: ĐẢM BẢO CẢ 2 CỘT ĐÃ CÓ TRONG DOM
  const exportItems = document.querySelectorAll('#exportItemsList .match-item');
  const stockItems = document.querySelectorAll('#stockItemsList .match-item');

  if (exportItems.length === 0 && stockItems.length === 0) {
    console.warn('Chưa có dữ liệu để cache!');
    return;
  }

  // BƯỚC 2: GỌI CACHE
  cacheOriginalLists();

  // BƯỚC 3: ÁP DỤNG LỌC (nếu có)
  renderFilteredLists();
}, 150); // Tăng delay để chắc chắn DOM đã render

  // Focus vào ô tìm kiếm ngay khi mở
  setTimeout(() => {
    document.getElementById('globalSearchInput')?.focus();
  }, 100);
}

// ====== LỌC & SẮP XẾP CÓ LOGIC THẬT (CÓ TÔ MÀU 2 BẢNG) ======
let activeFilters = {
  sort: null,
  priceDiff: null,   // lt10 / eq0 / lt15  (so sánh cặp sản phẩm)
  fuzzy: null,       // độ trùng tên
  priceValue: null,  // số nhập tay (VD: 120000)
  priceTarget: null  // nút nhanh (VD: 150000) - dùng ±15%
};
let originalExportItems = [];
let originalStockItems = [];

/**
 * Áp dụng bộ lọc thật và render lại popup
 */
function applyFilter(type, value) {
  console.log('📎 [FILTER CLICKED]', { type, value });
  switch (type) {
    case 'sort':
      activeFilters.sort = value;
      break;
    case 'priceDiff':
      activeFilters.priceDiff = value;
      break;
    case 'fuzzy':
      activeFilters.fuzzy = value;
      break;
    case 'priceTarget':
      // nếu nhấn lần nữa cùng nút thì toggle off
      activeFilters.priceTarget = activeFilters.priceTarget === value ? null : value;
      break;
  }
  // khi user bấm nút nhanh thì xóa ô nhập giá để tránh xung đột hiển thị
  if (type === 'priceTarget') {
    document.getElementById('priceValueInput') && (document.getElementById('priceValueInput').value = '');
    activeFilters.priceValue = null;
  }
  renderFilteredLists();
}

// Lọc động theo giá trị nhập (±15%)
function handlePriceValueInput(val) {
  if (!val) {
    activeFilters.priceValue = null;
  } else {
    const n = parseFloat(val);
    activeFilters.priceValue = isNaN(n) ? null : n;
    // khi người nhập bằng tay, clear priceTarget
    activeFilters.priceTarget = null;
  }
  renderFilteredLists();
}


/**
 * Xóa toàn bộ bộ lọc
 */
function resetFilters() {
  activeFilters = { sort: null, unit: false, priceDiff: null, fuzzy: null };
  renderFilteredLists();
  window.showToast('Đã xóa tất cả bộ lọc', 1500, 'info');
}

/**
 * Lấy dữ liệu gốc khi popup mở lần đầu
 */
function cacheOriginalLists() {
  // XÓA CACHE CŨ
  originalExportItems = [];
  originalStockItems = [];

  // LẤY LẠI TỪ DOM
  originalExportItems = Array.from(document.querySelectorAll('#exportItemsList .match-item')).map(el => ({
    html: el.outerHTML,
    name: el.querySelector('b')?.textContent?.trim() || '',
    price: parseFloat(el.dataset.price) || 0
  }));

  originalStockItems = Array.from(document.querySelectorAll('#stockItemsList .match-item')).map(el => ({
    html: el.outerHTML,
    name: el.querySelector('b')?.textContent?.trim() || '',
    price: parseFloat(el.dataset.price) || 0
  }));

  console.log('CACHE HOÀN TẤT:', {
    export: originalExportItems.map(i => ({name: i.name, price: i.price})),
    stock: originalStockItems.map(i => ({name: i.name, price: i.price}))
  });
}
/**
 * Tính độ tương đồng theo "cụm ký tự liên tục" (substring)
 * Giữ nguyên khoảng trắng, không bỏ dấu, không sắp xếp ký tự
 */
function substringSimilarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();

  let longest = 0;
  const lenA = a.length;
  const lenB = b.length;
  const dp = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > longest) longest = dp[i][j];
      }
    }
  }

  return longest / Math.max(lenA, lenB);
}

/**
 * Màu nền theo mức độ tương đồng
 */
function getColorBySim(sim) {
  if (sim >= 0.4) return '#d9f7be'; // xanh lá nhạt
  if (sim >= 0.3) return '#fff7a3'; // vàng nhạt
  if (sim >= 0.2) return '#ffe0b2'; // cam nhạt
  if (sim >= 0.1) return '#cce5ff'; // xanh dương nhạt
  return '';
}

/**
 * Áp dụng các filter và render lại 2 danh sách
 */
function renderFilteredLists() {
  if (!originalExportItems.length && !originalStockItems.length) {
    cacheOriginalLists();
  }

  let exportFiltered = [...originalExportItems];
  let stockFiltered = [...originalStockItems];

  const targetPrice = activeFilters.priceValue || activeFilters.priceTarget;
  if (targetPrice) {
    const min = targetPrice * 0.85;
    const max = targetPrice * 1.15;
    exportFiltered = exportFiltered.filter(e => e.price >= min && e.price <= max);
    stockFiltered = stockFiltered.filter(s => s.price >= min && s.price <= max);
  }

  if (activeFilters.fuzzy) {
    const threshold = activeFilters.fuzzy;
    const matchedExport = new Set();
    const matchedStock = new Set();

    for (const exp of exportFiltered) {
      for (const stock of stockFiltered) {
        const sim = substringSimilarity(exp.name, stock.name);
        if (sim >= threshold) {
          matchedExport.add(exp);
          matchedStock.add(stock);
        }
      }
    }

    exportFiltered = Array.from(matchedExport);
    stockFiltered = Array.from(matchedStock);
  }

  if (activeFilters.priceDiff) {
    let threshold = 0;
    if (activeFilters.priceDiff === 'lt10') threshold = 0.1;
    if (activeFilters.priceDiff === 'eq0') threshold = 0;
    if (activeFilters.priceDiff === 'lt15') threshold = 0.15;

    const matchedExport = new Set();
    const matchedStock = new Set();

    for (const exp of exportFiltered) {
      for (const stock of stockFiltered) {
        const p1 = exp.price, p2 = stock.price;
        if (!p1 || !p2) continue;
        const diff = Math.abs(p1 - p2) / ((p1 + p2) / 2);
        if (threshold === 0 ? Math.abs(p1 - p2) < 1 : diff <= threshold) {
          matchedExport.add(exp);
          matchedStock.add(stock);
        }
      }
    }

    exportFiltered = Array.from(matchedExport);
    stockFiltered = Array.from(matchedStock);
  }

  if (activeFilters.sort === 'az') {
    exportFiltered.sort((a, b) => a.name.localeCompare(b.name));
    stockFiltered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (activeFilters.sort === 'za') {
    exportFiltered.sort((a, b) => b.name.localeCompare(a.name));
    stockFiltered.sort((a, b) => b.name.localeCompare(a.name));
  }

  const noData = '<p style="text-align:center;color:#999;">Không có dữ liệu</p>';
  document.getElementById('exportItemsList').innerHTML = 
    exportFiltered.length ? exportFiltered.map(i => i.html).join('') : noData;
  document.getElementById('stockItemsList').innerHTML = 
    stockFiltered.length ? stockFiltered.map(i => i.html).join('') : noData;

  console.log('LỌC HOÀN TẤT:', { export: exportFiltered.length, stock: stockFiltered.length });
}

/**
 * Hàm tính độ giống ký tự cơ bản
 */
function fuzzyScoreSimple(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    if (b.includes(a[i])) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

/**
 * Áp dụng các filter và render lại 2 danh sách
 */




// === DRAG & DROP ===
function dragStart(e) {
  const el = e.target;
  el.classList.add('dragging');
  e.dataTransfer.setData('expIdx', el.dataset.expidx);
  e.dataTransfer.setData('itemIdx', el.dataset.itemidx);
}

function allowDrop(e) {
  e.preventDefault();
}

function drop(e) {
  e.preventDefault();
  const target = e.target.closest('.match-item[data-type="stock"]');
  if (!target) return;

  const expIdx = e.dataTransfer.getData('expIdx');
  const itemIdx = e.dataTransfer.getData('itemIdx');
  const stockIdx = target.dataset.stockidx;

  if (!expIdx || !itemIdx || !stockIdx) return;

  // GỌI HÀM TRỪ TỒN KHO
  selectStockItem(currentTaxCode, parseInt(expIdx), parseInt(itemIdx), parseInt(stockIdx));

  // ĐÁNH DẤU MÀU ĐỎ
  const draggedItem = document.querySelector(`[data-expidx="${expIdx}"][data-itemidx="${itemIdx}"]`);
  if (draggedItem) {
    draggedItem.classList.add('matched');
    draggedItem.querySelector('.qty').insertAdjacentHTML('afterend', ' <span style="color:red; font-weight:bold;">(ĐÃ KHỚP)</span>');
  }

  // CẬP NHẬT TỒN KHO TRONG POPUP
  updateStockInPopup(currentTaxCode, parseInt(stockIdx));

  // Cập nhật UI chính
  setTimeout(() => {
    renderExportInvoiceTable(currentTaxCode);
    window.renderTonKhoTab(currentTaxCode, 'main');
  }, 100);
}

function updateStockInPopup(taxCode, stockIdx) {
  const stock = hkdData[taxCode]?.tonkhoMain?.[stockIdx];
  if (!stock) return;
  const qty = parseFloat(stock.quantity) || 0;
  const el = document.querySelector(`[data-stockidx="${stockIdx}"] .qty`);
  if (el) {
    el.textContent = `SL: ${formatQuantity(qty)} ${stock.unit || ''}`;
    if (qty <= 0) {
      el.closest('.match-item').style.opacity = '0.5';
      el.closest('.match-item').innerHTML += ' <i style="color:#999;">(Hết)</i>';
    }
  }
}

function confirmAllMatches() {
  window.saveDataToLocalStorage();
  window.showToast('Đã lưu tất cả thay đổi tồn kho!', 2500, 'success');
  closeMatchPopup();
  renderExportInvoiceTable(currentTaxCode);
  window.renderTonKhoTab(currentTaxCode, 'main');
  updateMainTotalDisplay(currentTaxCode);
}

function closeMatchPopup() {
  const wrapper = document.getElementById('invoicePopupWrapper');
  if (wrapper) wrapper.remove();
  currentTaxCode = '';  // <-- chỉ gán, không khai báo
}
// main.js

// XÓA dòng khai báo hkdData, hkdOrder, currentTaxCode ở đây
// Sử dụng biến từ state.js

// Hàm đảm bảo dữ liệu HKD tồn tại
function ensureHkdData(taxCode) {
  if (!hkdData[taxCode]) {
    hkdData[taxCode] = {
      name: taxCode,
      tonkhoMain: [],
      tonkhoCK: [],
      tonkhoKM: [],
      invoices: [],
      exports: [], // Xuất hàng riêng cho từng HKD
      customers: []
    };
    if (!hkdOrder.includes(taxCode)) {
      hkdOrder.push(taxCode);
    }
  }
  return hkdData[taxCode];
}

async function handleFiles() {
  const input = document.getElementById("zipFile");
  const files = Array.from(input.files);

  // Danh sách taxCode đã xử lý (để cập nhật mặc định sau)
  const processedTaxCodes = new Set();

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      window.showToast(`Bỏ qua file không phải .zip: ${file.name}`, 3000, 'info');
      continue;
    }

    try {
      const invoice = await extractInvoiceFromZip(file);

      if (!invoice || !invoice.buyerInfo || !invoice.products) {
        window.showToast(`Không đọc được dữ liệu hóa đơn: ${file.name}`, 3000, 'error');
        continue;
      }

      const taxCode = invoice?.buyerInfo?.taxCode?.trim() || 'UNKNOWN';
      const name = invoice?.buyerInfo?.name?.trim() || taxCode;
      const mccqt = (invoice.invoiceInfo?.mccqt || '').toUpperCase();

      ensureHkdData(taxCode);
      
      if (!hkdData[taxCode].name || hkdData[taxCode].name === taxCode) {
        hkdData[taxCode].name = name;
      }

      const exists = (hkdData[taxCode]?.invoices || []).some(
        inv => (inv.invoiceInfo?.mccqt || '') === mccqt
      );
      if (exists) {
        window.showToast(`Bỏ qua MCCQT trùng: ${mccqt}`, 3000, 'info');
        continue;
      }

      hkdData[taxCode].invoices.push(invoice);

      invoice.products.forEach(p => {
        const entry = {
          ...p,
          lineDiscount: parseFloat(p.lineDiscount || 0),
          invoiceDate: invoice.invoiceInfo?.date || '',
          mccqt: invoice.invoiceInfo?.mccqt || '',
          taxCode: taxCode
        };
        const arr = entry.category === 'hang_hoa' ? 'tonkhoMain' :
                    entry.category === 'KM' ? 'tonkhoKM' : 'tonkhoCK';
        hkdData[taxCode][arr].push(entry);
      });

      processedTaxCodes.add(taxCode); // Đánh dấu HKD đã nhập

      window.logAction(`Nhập xong hóa đơn ${invoice.invoiceInfo.number} cho HKD ${taxCode}`, JSON.parse(JSON.stringify(hkdData)));

    } catch (err) {
      console.error(`Lỗi xử lý file ${file.name}:`, err);
      window.showToast(`File lỗi: ${file.name} - ${err.message}`, 3000, 'error');
      continue;
    }
  }

  // === SAU KHI NHẬP XONG TẤT CẢ FILE → LƯU MẶC ĐỊNH CHO TẤT CẢ HKD ===
  for (const taxCode of processedTaxCodes) {
    if (!hkdData[taxCode].tonkhoMainDefault) {
      const totalQty = hkdData[taxCode].tonkhoMain.reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
      const totalValue = hkdData[taxCode].tonkhoMain.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.price || 0)), 0);

      hkdData[taxCode].tonkhoMainDefault = {
        totalQty: totalQty.toFixed(6),
        totalValue: totalValue.toFixed(2)
      };

      console.log(`[HOÀN TẤT] Lưu tồn kho mặc định cho HKD ${taxCode}:`, hkdData[taxCode].tonkhoMainDefault);
    }
  }

  // Lưu + render + cập nhật giao diện
  window.saveDataToLocalStorage();
  window.renderHKDList();

  if (hkdOrder.length > 0) {
    const lastTaxCode = hkdOrder[hkdOrder.length - 1];
    window.renderHKDTab(lastTaxCode);
    updateMainTotalDisplay(lastTaxCode); // CẬP NHẬT CHÍNH XÁC
  }

  window.showToast('Đã xử lý xong tất cả file hóa đơn', 2000, 'success');
}

// Hàm xử lý file Excel xuất hàng - LƯU THEO HKD


// Hàm đọc file Excel
function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Lấy sheet đầu tiên
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Chuyển đổi sang JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = function() {
      reject(new Error('Lỗi đọc file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
function checkStockSync(taxCode) {
  const hkd = hkdData[taxCode];
  if (!hkd) return;

  console.log('=== KIỂM TRA ĐỒNG BỘ TỒN KHO ===', taxCode);
  
  let totalStockQty = 0;
  let totalStockValue = 0;
  
  hkd.tonkhoMain.forEach((stock, idx) => {
    const calculatedAmount = parseFloat(stock.quantity) * parseFloat(stock.price);
    const amountDiff = Math.abs(calculatedAmount - parseFloat(stock.amount));
    
    console.log(`${idx + 1}. ${stock.name}:`, {
      quantity: stock.quantity,
      price: stock.price,
      amount: stock.amount,
      calculatedAmount: calculatedAmount,
      amountDiff: amountDiff
    });
    
    totalStockQty += parseFloat(stock.quantity);
    totalStockValue += parseFloat(stock.amount);
  });

  console.log('TỔNG KẾT TỒN KHO:', {
    totalStockQty,
    totalStockValue
  });
}
function selectStockItem(taxCode, expIdx, originalIndex, stockIdx) {
  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.tonkhoMain?.[stockIdx] || !hkd.exports?.[expIdx]) {
    window.showToast('Dữ liệu không hợp lệ!', 2500, 'error');
    return;
  }

  const stock = hkd.tonkhoMain[stockIdx];
  const exp = hkd.exports[expIdx];
  const item = exp.items[originalIndex];

  // Kiểm tra tồn kho
  const qtyAvail = parseFloat(stock.quantity) || 0;
  if (qtyAvail <= 0) {
    window.showToast(`Tồn kho "${stock.name}" đã hết!`, 2500, 'error');
    return;
  }

  // Tính toán số lượng
  const qtyNeed = parseFloat(item.qty) || 0;
  if (qtyNeed <= 0) {
    window.showToast(`Số lượng cần xuất = 0`, 2000, 'info');
    return;
  }

  const actualQtyToDeduct = Math.min(qtyNeed, qtyAvail);

  // CẬP NHẬT TỒN KHO
  stock.quantity = (qtyAvail - actualQtyToDeduct).toFixed(6);
  stock.amount = (parseFloat(stock.quantity) * parseFloat(stock.price)).toFixed(2);

  console.log('CẬP NHẬT TỒN KHO THỦ CÔNG:', {
    name: stock.name,
    oldQty: qtyAvail,
    newQty: stock.quantity,
    deducted: actualQtyToDeduct
  });

  // Cập nhật item xuất hàng
  item.qty = (qtyNeed - actualQtyToDeduct).toFixed(6);
  item.amount = (parseFloat(item.qty) * parseFloat(item.price)).toFixed(2);
  item.priceInput = parseFloat(stock.price);
  item.manualMatched = true;

  // Ghi lịch sử
  if (!item.matchedHistory) item.matchedHistory = [];
  item.matchedHistory.push({
    stockIdx,
    qty: actualQtyToDeduct,
    priceInput: parseFloat(stock.price),
    timestamp: new Date().toISOString(),
    manual: true
  });

  // Cập nhật tổng tiền
  exp.total = exp.items.reduce((sum, it) => sum + parseFloat(it.amount || 0), 0).toFixed(2);

  // Thông báo
  const remaining = parseFloat(item.qty);
  if (remaining <= 0) {
    window.showToast(`✅ Đã xuất hết "${item.name}"!`, 2200, 'success');
  } else {
    window.showToast(`Đã trừ ${actualQtyToDeduct}. Còn ${remaining}`, 3000, 'warning');
  }

  // CẬP NHẬT GIAO DIỆN CẢ HAI TAB
  closeStockSelector();
  renderExportInvoiceTable(taxCode);
  window.renderTonKhoTab(taxCode, 'main'); // QUAN TRỌNG: cập nhật tab tồn kho
  updateMainTotalDisplay(taxCode);
  window.saveDataToLocalStorage();
}
function mergeDuplicateItems(items) {
  const mergedMap = new Map();

  items.forEach((item, index) => {
    // BỎ QUA ITEM "PHẦN CÒN LẠI" TỪ TỰ ĐỘNG KHỚP
    if (item.isRemaining) {
      mergedMap.set(`__remaining_${index}`, {
        ...item,
        originalIndex: index,
        originalIndexes: [index]
      });
      return;
    }

    const key = `${item.name.trim().toLowerCase()}|${parseFloat(item.price || 0).toFixed(6)}`;
    const qty = parseFloat(item.qty || 0);

    // TÍNH originalQty CHO MỖI ITEM GỐC
    const originalQty = qty + (item.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);

    // === XỬ LÝ ITEM ĐÃ XUẤT HẾT (qty <= 0) ===
    if (qty <= 0) {
      const doneKey = `${key}_done_${index}`;
      mergedMap.set(doneKey, {
        ...item,
        originalIndex: index,
        originalIndexes: [index],
        originalQty
      });
      return;
    }

    // === GỘP VỚI ITEM ĐÃ TỒN TẠI ===
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);

      // GỘP SỐ LƯỢNG + THÀNH TIỀN
      existing.qty = (parseFloat(existing.qty) + qty).toFixed(6);
      existing.amount = (parseFloat(existing.amount) + parseFloat(item.amount || 0)).toFixed(2);

      // GỘP originalQty
      existing.originalQty = (parseFloat(existing.originalQty || 0) + originalQty).toFixed(6);

      // GỘP matchedHistory
      if (item.matchedHistory?.length) {
        if (!existing.matchedHistory) existing.matchedHistory = [];
        existing.matchedHistory.push(...item.matchedHistory);
      }

      // Ghi nhận chỉ mục gốc
      existing.originalIndexes.push(index);

    } else {
      // TẠO MỚI
      mergedMap.set(key, {
        ...JSON.parse(JSON.stringify(item)),
        originalIndex: index,
        originalIndexes: [index],
        originalQty
      });
    }
  });

  // === CHUYỂN VỀ MẢNG, GIỮ THỨ TỰ GỐC ===
  const result = [];
  const seenKeys = new Set();

  items.forEach((item, index) => {
    // XỬ LÝ ITEM "PHẦN CÒN LẠI"
    if (item.isRemaining) {
      const key = `__remaining_${index}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const merged = mergedMap.get(key);
        if (merged) result.push(merged);
      }
      return;
    }

    const qty = parseFloat(item.qty || 0);
    const baseKey = `${item.name.trim().toLowerCase()}|${parseFloat(item.price || 0).toFixed(6)}`;

    if (qty <= 0) {
      const doneKey = `${baseKey}_done_${index}`;
      if (!seenKeys.has(doneKey)) {
        seenKeys.add(doneKey);
        const merged = mergedMap.get(doneKey);
        if (merged) result.push(merged);
      }
      return;
    }

    if (!seenKeys.has(baseKey)) {
      seenKeys.add(baseKey);
      const merged = mergedMap.get(baseKey);
      if (merged) result.push(merged);
    }
  });

  return result;
}
// === HÀM HỖ TRỢ: ĐỊNH DẠNG SỐ LƯỢNG ===
/**
 * Định dạng số lượng: loại bỏ .0000, giữ số nguyên nếu không có thập phân
 */
function formatQuantity(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  
  // Nếu là số nguyên → trả về dạng chuỗi không thập phân
  if (Number.isInteger(num)) return num.toString();
  
  // Nếu có thập phân → làm tròn 4 chữ số, loại bỏ số 0 thừa
  return num.toFixed(4).replace(/\.?0+$/, '');
}
function renderExportInvoiceTable(taxCode) {
  const hkd = hkdData[taxCode];
  const placeholder = document.getElementById(`${taxCode}-exportTablePlaceholder`);
  if (!placeholder) return;
  
  if (!hkd?.exports?.length) {
    placeholder.innerHTML = '<p style="text-align:center; color:#999; padding:30px; font-size:1.1em;">Chưa có hóa đơn xuất.</p>';
    return;
  }

  let html = `
    <h3 style="margin:15px 0 10px; font-weight:bold; color:#1976d2;">Xuất Hàng - HKD ${taxCode}</h3>
    <div style="margin: 20px 0; text-align: center;">
      <button onclick="openMatchByDragPopup('${taxCode}')" 
              style="padding: 12px 28px; font-size: 1.1em; background: #1976d2; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        Khớp Tồn Kho Bằng Kéo Thả
      </button>
    </div>`;

  hkd.exports.forEach((exp, expIdx) => {
    // === LẤY TIÊU ĐỀ TỪ TÊN FILE (nếu có) ===
    let title = exp.invoiceInfo?.mccqt || 'N/A';
    if (exp.source === 'excel' && exp.fileName) {
      title = exp.fileName.replace(/\.[^.]+$/, ''); // Bỏ đuôi .xlsx, .xls
    }

    // === TÍNH TỔNG TIỀN GỐC (trước khi xuất) ===
    const originalTotal = exp.items.reduce((sum, it) => {
      const origQty = parseFloat(it.qty) + (it.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);
      return sum + (origQty * parseFloat(it.price || 0));
    }, 0);

    // === TÍNH TỔNG TIỀN CÒN LẠI (chưa xuất) ===
    const remainingTotal = exp.items.reduce((sum, it) => {
      const remQty = parseFloat(it.qty) || 0;
      return sum + (remQty * parseFloat(it.price || 0));
    }, 0);

    const sourceBadge = exp.source === 'excel' 
      ? `<span style="background:#28a745; color:white; padding:3px 7px; border-radius:4px; font-size:0.8em; margin-left:8px;">EXCEL</span>` 
      : '';

    const toggleId = `export-detail-${taxCode}-${expIdx}`;

    html += `
      <div style="border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:15px; background:#fafafa;">
        <!-- TIÊU ĐỀ + 2 SỐ TIỀN + NÚT MỞ RỘNG -->
        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; color:#d32f2f; margin-bottom:8px;">
          <div style="flex:1;">
            <span>${title} ${sourceBadge}</span>
          </div>
          <div style="display:flex; gap:15px; font-size:0.95em; color:#1976d2; text-align:right;">
            <div>
              <div style="font-size:0.8em; color:#666;">Tổng bảng kê</div>
              <div><strong>${window.formatCurrencyVN(originalTotal)}</strong></div>
            </div>
            <div>
              <div style="font-size:0.8em; color:#666;">Còn lại</div>
              <div><strong style="color:#d32f2f;">${window.formatCurrencyVN(remainingTotal)}</strong></div>
            </div>
          </div>
          <button onclick="toggleExportDetail('${toggleId}')" 
                  style="margin-left:10px; padding:4px 10px; font-size:0.8em; background:#eee; border:1px solid #ccc; border-radius:4px; cursor:pointer;">
            Mở rộng
          </button>
        </div>

        <!-- BẢNG CHI TIẾT (ẨN MẶC ĐỊNH) -->
        <div id="${toggleId}" style="display:none; margin-top:10px;">
          <table style="width:100%; background:#fff; font-size:0.9em; border-collapse:collapse; border:1px solid #eee;">
            <thead style="background:#e3f2fd;">
              <tr>
                <th style="padding:8px; border:1px solid #ddd;">STT</th>
                <th>Mã SP</th><th>Tên hàng</th><th>ĐVT</th><th>SL gốc</th><th>SL còn</th><th>Đơn giá</th><th>Thành tiền</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>`;

    const mergedItems = mergeDuplicateItems(exp.items);

    mergedItems.forEach((item, displayIdx) => {
      const originalIndex = item.originalIndex;
      const remaining88Qty = parseFloat(item.qty) || 0;
      const matchedQty = (item.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);
      const originalQty = remaining88Qty + matchedQty;

      html += `
        <tr style="${remaining88Qty <= 0 ? 'opacity:0.6;' : ''}">
          <td>${displayIdx + 1}</td>
          <td>${item.code || ''}</td>
          <td>${item.name || ''}</td>
          <td>${item.unit || ''}</td>
          <td>${formatQuantity(originalQty)}</td>
          <td style="color:#d32f2f;">${formatQuantity(remaining88Qty)}</td>
          <td>${window.formatCurrencyVN(item.price)}</td>
          <td>${window.formatCurrencyVN(remaining88Qty * item.price)}</td>
          <td>
            ${remaining88Qty > 0 ? 
              `<button onclick="openStockSelector('${taxCode}', ${expIdx}, ${originalIndex})" 
                       style="padding:4px 8px; font-size:0.8em;">Chọn TK</button>` 
              : '<span style="color:#2e7d32;">Đã xuất</span>'
            }
          </td>
        </tr>`;
    });

    html += `</tbody></table></div></div>`;
  });

  placeholder.innerHTML = html;
}
function toggleExportDetail(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';

  // Cập nhật nút
  const btn = el.parentElement.querySelector('button[onclick*="toggleExportDetail"]');
  if (btn) {
    btn.textContent = isHidden ? 'Thu gọn' : 'Mở rộng';
    btn.style.background = isHidden ? '#1976d2' : '#eee';
    btn.style.color = isHidden ? 'white' : 'black';
  }
}

function checkDuplicateItems(taxCode, exportRecord) {
  console.log('=== KIỂM TRA ITEMS TRÙNG ===', taxCode);
  
  const itemCount = new Map();
  
  exportRecord.items.forEach((item, idx) => {
    const key = item.name.trim().toLowerCase();
    if (itemCount.has(key)) {
      itemCount.set(key, itemCount.get(key) + 1);
    } else {
      itemCount.set(key, 1);
    }
  });

  // Hiển thị items trùng
  itemCount.forEach((count, name) => {
    if (count > 1) {
      console.log(`🚨 TRÙNG: ${name} - ${count} lần`);
    }
  });

  return itemCount;
}
function phraseSimilarity(s1, s2) {
  // === 1️⃣ Chuẩn hóa: bỏ dấu, bỏ ký tự đặc biệt, bỏ khoảng trắng ===
  const normalize = (s) => removeVietnameseAccents(String(s || '').toLowerCase())
    .replace(/[^a-z0-9]/g, '') // chỉ giữ chữ & số
    .trim();

  s1 = normalize(s1);
  s2 = normalize(s2);

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  // === 2️⃣ So sánh độ trùng ký tự liền mạch ===
  const len1 = s1.length;
  const len2 = s2.length;
  const minLen = Math.min(len1, len2);
  const maxLen = Math.max(len1, len2);

  let sameCount = 0;
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) sameCount++;
  }

  // Tính tỉ lệ trùng (độ dài tương đối)
  const nameRatio = sameCount / maxLen;

  return Math.min(nameRatio, 1);
}

function substringSimilarity(s1, s2) {
  s1 = removeVietnameseAccents(s1.toLowerCase());
  s2 = removeVietnameseAccents(s2.toLowerCase());
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  let matches = 0;
  let i = 0, j = 0;
  while (i < s1.length && j < s2.length) {
    if (s1[i] === s2[j]) {
      matches++;
      i++; j++;
    } else {
      i++;
    }
  }
  return (2.0 * matches) / (s1.length + s2.length);
}
function autoMatchAndDeduct(taxCode, exportRecord) {
  console.log('🔁 TỰ ĐỘNG KHỚP TỒN KHO (100% | 70% + ±10%)', taxCode);

  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.tonkhoMain || !exportRecord?.items) return;

  const stockList = hkd.tonkhoMain;
  const exportItems = exportRecord.items;

  const cleanPrice = (val) => parseFloat(String(val).replace(/[^\d.]/g, '')) || 0;
  const normalizeName = (s) =>
    removeVietnameseAccents(String(s || '').toLowerCase()).replace(/\s+/g, '');

  exportItems.forEach((expItem) => {
    const expName = expItem.name?.trim();
    const expQty = parseFloat(expItem.qty) || 0;
    const expPrice = cleanPrice(expItem.priceInput || expItem.price);
    if (!expName || expQty <= 0 || expPrice <= 0) return;

    const normExp = normalizeName(expName);
    let matched = false;

    for (let sIdx = 0; sIdx < stockList.length; sIdx++) {
      const stock = stockList[sIdx];
      const stockQty = parseFloat(stock.quantity) || 0;
      const stockPrice = cleanPrice(stock.price);
      if (stockQty <= 0 || stockPrice <= 0) continue;

      const normStock = normalizeName(stock.name);

      // ==== 1️⃣ TRÙNG 100% ====
      const isExact = normExp === normStock;

      // ==== 2️⃣ TRÙNG 70% TÊN + ±10% GIÁ ====
      const minLen = Math.min(normExp.length, normStock.length);
      let sameCount = 0;
      for (let i = 0; i < minLen; i++) {
        if (normExp[i] === normStock[i]) sameCount++;
      }
      const nameRatio = sameCount / Math.max(normExp.length, normStock.length);
      const priceDiff = Math.abs(expPrice - stockPrice) / stockPrice;

      const isFuzzy = nameRatio >= 0.7 && priceDiff <= 0.10;

      // ==== 3️⃣ ĐIỀU KIỆN KHỚP ====
      if (!(isExact || isFuzzy)) continue;

      const deductQty = Math.min(expQty, stockQty);
      if (deductQty <= 0) continue;

      const oldQty = stockQty;
      stock.quantity = (stockQty - deductQty).toFixed(6);
      stock.amount = parseFloat((parseFloat(stock.quantity) * stockPrice).toFixed(2));

      if (!expItem.matchedHistory) expItem.matchedHistory = [];
      expItem.matchedHistory.push({
        stockIdx: sIdx,
        qty: deductQty,
        priceInput: stockPrice,  // ✅ THÊM DÒNG NÀY - QUAN TRỌNG!
        timestamp: new Date().toISOString(),
        matchType: isExact ? 'EXACT_100%' : 'FUZZY_70%',
        nameRatio: nameRatio.toFixed(3),
        priceDiff: priceDiff.toFixed(3),
      });

      console.log('✅ GỘP TỒN:', {
        'Tên xuất': expName,
        'Tên tồn': stock.name,
        'Loại khớp': isExact ? 'TRÙNG 100%' : 'FUZZY ≥70% ±10%',
        'Độ trùng tên': (nameRatio * 100).toFixed(1) + '%',
        'Chênh giá': (priceDiff * 100).toFixed(2) + '%',
        'Giá tồn kho': window.formatCurrencyVN(stockPrice),  // ✅ THÊM DÒNG NÀY
        'Số lượng trừ': deductQty,
        'Tồn cũ': oldQty,
        'Tồn mới': stock.quantity,
      });

      expItem.qty = (expQty - deductQty).toFixed(6);
      matched = true;
      if (parseFloat(expItem.qty) <= 0) break;
    }
  });

  setTimeout(() => {
    window.renderTonKhoTab(taxCode, 'main');
    updateMainTotalDisplay(taxCode);
    window.saveDataToLocalStorage();
  }, 50);
}


// Hàm xử lý file ZIP hóa đơn đầu ra (xuất hàng) - LƯU THEO HKD
async function handleOutputFiles(files) {
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      window.showToast(`Bỏ qua file không phải .zip: ${file.name}`, 3000, 'info');
      continue;
    }

    try {
      const invoice = await extractInvoiceFromZip(file);

      if (!invoice || !invoice.sellerInfo || !invoice.products) {
        window.showToast(`Không đọc được dữ liệu hóa đơn đầu ra: ${file.name}`, 3000, 'error');
        continue;
      }

      // LẤY MST NGƯỜI BÁN → LÀM HKD
      const taxCode = invoice.sellerInfo.taxCode?.trim() || 'UNKNOWN';
      const name = invoice.sellerInfo.name?.trim() || taxCode;
      const mccqt = (invoice.invoiceInfo?.mccqt || '').toUpperCase();

      // Đảm bảo HKD tồn tại và KHÔNG xóa dữ liệu cũ
      ensureHkdData(taxCode);
      
      // Cập nhật tên nếu chưa có
      if (!hkdData[taxCode].name || hkdData[taxCode].name === taxCode) {
        hkdData[taxCode].name = name;
      }

      // Kiểm tra trùng MCCQT (chỉ trong exports của HKD này)
      const exists = (hkdData[taxCode]?.exports || []).some(e => e.invoiceInfo?.mccqt === mccqt);
      if (exists) {
        window.showToast(`Bỏ qua MCCQT trùng: ${mccqt}`, 3000, 'info');
        continue;
      }

      // Tạo bản ghi xuất - THÊM vào exports của HKD
      const exportRecord = {
        ...invoice,
        type: 'export',
        exportDate: invoice.invoiceInfo?.date || new Date().toISOString().split('T')[0],
        items: invoice.products.map(p => ({
          code: p.code || '',
          name: p.name || '',
          unit: p.unit || '',
          qty: parseFloat(p.quantity) || 0,
          price: parseFloat(p.price) || 0,
          amount: parseFloat(p.amount) || 0,
          taxRate: p.taxRate || 0,
          priceInput: 0,
          category: p.category || 'hang_hoa',
          matched: false,
          manualMatched: false,
          taxCode: taxCode // Lưu HKD
        })),
        total: invoice.totals?.afterTax || 0,
        customer: invoice.buyerInfo || {},
        taxCode: taxCode // Quan trọng: lưu HKD
      };

      // THÊM vào exports của HKD
      hkdData[taxCode].exports.push(exportRecord);

      // TỰ ĐỘNG KHỚP + GIẢM TỒN KHO CỦA HKD NÀY
      autoMatchAndDeduct(taxCode, exportRecord);

      window.logAction(`Nhập xong hóa đơn xuất ${mccqt} cho HKD ${taxCode}`, JSON.parse(JSON.stringify(hkdData)));

    } catch (err) {
      console.error(`Lỗi xử lý file xuất: ${file.name}`, err);
      window.showToast(`File lỗi: ${file.name}`, 3000, 'error');
    }
  }

  window.saveDataToLocalStorage();
  window.renderHKDList();

  if (hkdOrder.length > 0) {
    const lastTaxCode = hkdOrder[hkdOrder.length - 1];
    window.renderHKDTab(lastTaxCode);
    setTimeout(() => {
      const tab = document.querySelector(`[onclick*="${lastTaxCode}-xuathang"]`);
      if (tab) tab.click();
    }, 100);
  }

  window.showToast('Đã xử lý xong tất cả file hóa đơn xuất hàng', 2000, 'success');
}

async function extractInvoiceFromZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);

  const xmlFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.xml'));
  const htmlFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.html'));

  if (!xmlFile) throw new Error("Không tìm thấy file XML trong ZIP");

  const xmlContent = await xmlFile.async('text');
  const invoice = parseXmlInvoice(xmlContent);
  invoice._taxCode = invoice?.buyerInfo?.taxCode?.trim() || 'UNKNOWN';

  if (htmlFile) {
    const htmlContent = await htmlFile.async('text');
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(blob);
    invoice.htmlUrl = htmlUrl;
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
    const exports = hkd.exports || [];

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

    // Hiển thị thống kê
    const totalExports = exports.length;
    const totalInventory = (hkd.tonkhoMain || []).length;

    li.innerHTML = `
      <div onclick="window.renderHKDTab('${taxCode}')">
        <strong>${taxCode}</strong><br>
        <span>${name}</span><br>
        <small style="color: #666;">
          📦 ${totalInventory} tồn kho | 📤 ${totalExports} xuất hàng
        </small>
      </div>
      <button onclick="toggleInvoiceList('${taxCode}')">📄 Xem hóa đơn</button>
      <ul id="${idList}" style="display:none;">
        ${
          mccqtList.length
            ? mccqtList
                .map(
                  item => `
            <li onclick="renderInvoiceDetail('${taxCode}','${item.mccqt}')">
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
function debugExportStatistics(taxCode) {
  const hkd = hkdData[taxCode];
  if (!hkd) return;

  console.log('=== DEBUG THỐNG KÊ XUẤT HÀNG ===', taxCode);
  
  let totalMatchedQty = 0;
  let totalOriginalQty = 0;
  
  (hkd.exports || []).forEach((exp, expIdx) => {
    console.log(`Export ${expIdx + 1}:`);
    (exp.items || []).forEach((item, itemIdx) => {
      const matchedQty = (item.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);
      const originalQty = parseFloat(item.originalQty) || parseFloat(item.qty) || 0;
      
      totalMatchedQty += matchedQty;
      totalOriginalQty += originalQty;
      
      console.log(`  ${itemIdx + 1}. ${item.name}:`, {
        originalQty,
        matchedQty,
        remaining: originalQty - matchedQty,
        matchedHistory: item.matchedHistory?.length || 0
      });
    });
  });

  console.log('TỔNG KẾT:', {
    totalOriginalQty,
    totalMatchedQty,
    difference: totalOriginalQty - totalMatchedQty
  });

  // So sánh với tồn kho
  const totalStockQty = (hkd.tonkhoMain || []).reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  console.log('SO SÁNH TỒN KHO:', {
    totalStockQty,
    shouldBe: totalOriginalQty - totalMatchedQty
  });
}
function renderHKDTab(taxCode) {
  currentTaxCode = taxCode;
  ensureHkdData(taxCode);
  const hkd = hkdData[taxCode];

  // LẤY TÊN CÔNG TY
  const companyName = hkd.name || taxCode;
const companyInfo = `
  <div class="company-header">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
    <span class="company-name">${companyName}</span>
    <span class="tax-code">${taxCode}</span>
  </div>
`;

  /* ---------- 1. TỒN KHO ---------- */
  const totalInvQty = (hkd.tonkhoMain || []).reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  const totalInvValue = (hkd.tonkhoMain || []).reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.price || 0)), 0);

  /* ---------- 2. XUẤT HÀNG ---------- */
  let totalExpQty = 0;
  let totalExpValue = 0;

  (hkd.exports || []).forEach(exp => {
    (exp.items || []).forEach(item => {
      const matchedQty = (item.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);
      if (matchedQty > 0) {
        totalExpQty += matchedQty;
        totalExpValue += matchedQty * parseFloat(item.priceInput || item.price || 0);
      }
    });
  });

  /* ---------- 3. HTML KHUNG ---------- */
  const html = `
    <!-- Tabs - GIỮ NGUYÊN NÚT CŨ -->
    <div class="tabs">
      <div class="tab active"   onclick="openTab(event,'${taxCode}-tonkho')">Tồn kho</div>
      <div class="tab"          onclick="openTab(event,'${taxCode}-xuathang')">Xuất Hàng</div>
    </div>

    <!-- DÒNG TÊN CÔNG TY - THÊM MỚI -->
    ${companyInfo}

    <!-- TAB TỒN KHO -->
    <div id="${taxCode}-tonkho" class="tab-content active hkd-section">
      <div class="summary-grid" style="margin: 20px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
        <div class="summary-box">
          <div class="label">Tổng SL tồn kho</div>
          <div class="value" id="inv-qty" style="font-weight:bold; color:#1976d2;">${formatQuantity(totalInvQty)}</div>
        </div>
        <div class="summary-box">
          <div class="label">Tổng tiền tồn kho (thực tế)</div>
          <div class="value" id="inv-value" style="color:#2e7d32; font-weight:bold;">${window.formatCurrencyVN(totalInvValue)}</div>
        </div>
        <div class="summary-box">
          <div class="label">Tổng tiền kho (mặc định)</div>
          <div class="value" id="inv-default-value" style="color:#666;">0 ₫</div>
        </div>
        <div class="summary-box">
          <div class="label">Tổng tiền đã giảm</div>
          <div class="value" id="inv-reduced-value" style="color:#d32f2f; font-weight:bold;">0 ₫</div>
        </div>
      </div>

      <div class="tonkho-tab-buttons" style="display:flex;gap:10px;justify-content:space-between;padding:10px;background:#f8f8f8;border-radius:8px;border:1px solid #ddd;">
        <div style="display:flex;gap:10px;">
          <button onclick="switchTonKhoTab('main')">Hàng hóa</button>
          <button onclick="switchTonKhoTab('km')">Khuyến mại</button>
          <button onclick="switchTonKhoTab('ck')">Chiết khấu</button>
        </div>
        <button onclick="exportAllInventoryToExcel('${taxCode}')">Xuất Excel</button>
      </div>

      <div style="margin-top:20px">
        <div id="tonKho-main"></div>
        <div id="tonKho-km" style="display:none;"></div>
        <div id="tonKho-ck" style="display:none;"></div>
      </div>
    </div>

    <!-- TAB XUẤT HÀNG -->
    <div id="${taxCode}-xuathang" class="tab-content" style="display:none;">
      <div class="summary-grid" style="margin: 20px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
        <div class="summary-box">
          <div class="label">Tổng SL đã xuất</div>
          <div class="value" id="exp-items" style="font-weight:bold; color:#1976d2;">${formatQuantity(totalExpQty)}</div>
        </div>
        <div class="summary-box">
          <div class="label">Doanh thu bán</div>
          <div class="value" id="exp-revenue-sell" style="font-weight:bold; color:#2e7d32;">0 ₫</div>
        </div>
        <div class="summary-box">
          <div class="label">Giá vốn đã xuất</div>
          <div class="value" id="exp-revenue-cost" style="color:#d32f2f;">0 ₫</div>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <input type="file" id="excelExportFile-${taxCode}" accept=".xlsx,.xls" style="display: none;" 
               onchange="handleExcelExportFileUpload('${taxCode}', this.files[0])">
        <button onclick="document.getElementById('excelExportFile-${taxCode}').click()" 
                style="background: #28a745; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">
          Tải file Excel xuất hàng
        </button>
        <span style="margin-left: 10px; color: #666;">Định dạng: .xlsx, .xls</span>
      </div>

      <div id="${taxCode}-exportTablePlaceholder"></div>
    </div>
  `;

  document.getElementById('hkdInfo').innerHTML = html;

  /* ---------- 4. RENDER + CẬP NHẬT ---------- */
  window.renderTonKhoTab(taxCode, 'main');
  updateMainTotalDisplay(taxCode);
}

// Hàm xử lý upload file Excel xuất hàng - LƯU THEO HKD
// Trong handleExcelExportFile - Gọi autoMatch ngay sau khi nhập
async function handleExcelExportFile(file, taxCode) {
  try {
    const data = await readExcelFile(file);
    if (!data || data.length === 0) {
      throw new Error('File Excel không có dữ liệu');
    }

    ensureHkdData(taxCode);

    const exportRecord = {
      type: 'export',
      exportDate: new Date().toISOString().split('T')[0],
      invoiceInfo: { mccqt: `EXCEL_${Date.now()}` },
      items: [],
      total: 0,
      customer: { name: 'Nhập từ Excel', taxCode: 'EXCEL_IMPORT' },
      source: 'excel',
      fileName: file.name,
      taxCode: taxCode
    };

    let totalAmount = 0;
    data.forEach((row, index) => {
      const name = row['Mặt Hàng'] || row['Tên hàng'] || '';
      const quantity = parseFloat(row['Số lượng'] || row['SL'] || 0);
      const price = parseFloat(row['Đơn giá'] || row['Giá'] || 0);
      const amount = quantity * price;

      if (name && quantity > 0) {
        const item = {
          code: row['Mã hàng'] || `EXCEL_${index + 1}`,
          name: name,
          unit: row['ĐVT'] || row['Đơn vị tính'] || '',
          qty: quantity,
          price: price,
          amount: amount,
          matched: false,
          manualMatched: false,
          autoMatched: false
        };

        exportRecord.items.push(item);
        totalAmount += amount;
      }
    });

    exportRecord.total = totalAmount;

    if (!hkdData[taxCode].exports) hkdData[taxCode].exports = [];
    hkdData[taxCode].exports.push(exportRecord);

    // TỰ ĐỘNG KHỚP NGAY SAU KHI NHẬP
    autoMatchAndDeduct(taxCode, exportRecord);

    window.saveDataToLocalStorage();
    return exportRecord;

  } catch (err) {
    console.error('❌ Lỗi xử lý file Excel:', err);
    throw err;
  }
}

// Trong handleOutputFiles - Gọi autoMatch ngay sau khi nhập
async function handleOutputFiles(files) {
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.zip')) continue;

    try {
      const invoice = await extractInvoiceFromZip(file);
      if (!invoice || !invoice.sellerInfo || !invoice.products) continue;

      const taxCode = invoice.sellerInfo.taxCode?.trim() || 'UNKNOWN';
      ensureHkdData(taxCode);

      const exportRecord = {
        ...invoice,
        type: 'export',
        exportDate: invoice.invoiceInfo?.date || new Date().toISOString().split('T')[0],
        items: invoice.products.map(p => ({
          code: p.code || '',
          name: p.name || '',
          unit: p.unit || '',
          qty: parseFloat(p.quantity) || 0,
          price: parseFloat(p.price) || 0,
          amount: parseFloat(p.amount) || 0,
          matched: false,
          manualMatched: false,
          autoMatched: false
        })),
        total: invoice.totals?.afterTax || 0,
        customer: invoice.buyerInfo || {},
        taxCode: taxCode
      };

      if (!hkdData[taxCode].exports) hkdData[taxCode].exports = [];
      hkdData[taxCode].exports.push(exportRecord);

      // TỰ ĐỘNG KHỚP NGAY SAU KHI NHẬP
      autoMatchAndDeduct(taxCode, exportRecord);

    } catch (err) {
      console.error(`Lỗi xử lý file xuất: ${file.name}`, err);
    }
  }

  window.saveDataToLocalStorage();
  window.renderHKDList();
  
  if (hkdOrder.length > 0) {
    const lastTaxCode = hkdOrder[hkdOrder.length - 1];
    window.renderHKDTab(lastTaxCode);
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

  window.showPopup(html, `Chi tiết hóa đơn ${mccqt}`);
}


function validateStockBeforeSelection(taxCode, expIdx, originalIndex) {
  const exp = hkdData[taxCode]?.exports?.[expIdx];
  const item = exp?.items?.[originalIndex];
  
  if (!item) {
    console.error('Không tìm thấy item');
    return false;
  }

  const availableStock = hkdData[taxCode]?.tonkhoMain?.filter(stock => {
    if (parseFloat(stock.quantity) <= 0) return false;
    
    const stockName = removeVietnameseAccents(stock.name.toLowerCase());
    const itemName = removeVietnameseAccents(item.name.toLowerCase());
    
    const stockNameClean = stockName.replace(/[^\w\s]/g, '').trim();
    const itemNameClean = itemName.replace(/[^\w\s]/g, '').trim();
    
    return stockNameClean === itemNameClean || 
           stockNameClean.includes(itemNameClean) || 
           itemNameClean.includes(stockNameClean);
  });

  console.log('KIỂM TRA TỒN KHO KHẢ DỤNG:', {
    itemName: item.name,
    availableStock: availableStock?.length || 0,
    stockNames: availableStock?.map(s => s.name) || []
  });

  return availableStock && availableStock.length > 0;
}
function filterStockOptions(query) {
  const q = removeVietnameseAccents(query.toLowerCase()).trim();
  const container = document.getElementById('stockOptionsContainer');
  const items = container.querySelectorAll('.stock-option-item');

  let visibleCount = 0;
  
  items.forEach(item => {
    const name = item.getAttribute('data-name');
    const matches = !q || name.includes(q);
    item.style.display = matches ? 'block' : 'none';
    if (matches) visibleCount++;
  });

  // Hiển thị thông báo nếu không tìm thấy
  let noResultsMsg = container.querySelector('.no-results-message');
  if (visibleCount === 0 && q) {
    if (!noResultsMsg) {
      noResultsMsg = document.createElement('div');
      noResultsMsg.className = 'no-results-message';
      noResultsMsg.style.padding = '20px';
      noResultsMsg.style.textAlign = 'center';
      noResultsMsg.style.color = '#999';
      noResultsMsg.innerHTML = `Không tìm thấy tồn kho nào với "<b>${query}</b>"`;
      container.appendChild(noResultsMsg);
    }
  } else if (noResultsMsg) {
    noResultsMsg.remove();
  }
}
function openTab(evt, tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

  const target = document.getElementById(tabId);
  if (!target) return window.showToast(`Không tìm thấy tab ${tabId}`,3000,'error');
  target.style.display = 'block';
  evt?.currentTarget?.classList.add('active');

  const taxCode = tabId.split('-')[0];

  if (tabId.includes('tonkho'))   window.renderTonKhoTab(taxCode, 'main');
  if (tabId.includes('xuathang')) renderExportInvoiceTable(taxCode);
}

function initApp() {
  if (window.innerWidth < 768) {
    document.body.classList.add('compact-mode');
  }

  window.loadDataFromLocalStorage();
  window.renderHKDList();

  // Đăng ký tất cả các hàm toàn cục
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
  window.openMatchByDragPopup = openMatchByDragPopup;
  window.showLogHistory = showLogHistory;
  window.undoAction = undoAction;
  window.openTab = openTab;
  window.switchTonKhoTab = switchTonKhoTab;
  window.toggleExportDetail = toggleExportDetail;
  // Thêm các hàm mới - QUAN TRỌNG
  window.handleExcelExportFileUpload = handleExcelExportFileUpload;
  window.autoMatchAndDeduct = autoMatchAndDeduct; // THÊM DÒNG NÀY
  window.openStockSelector = openStockSelector;
  window.closeStockSelector = closeStockSelector;
  window.validateCalculations = validateCalculations;
  window.filterStockOptions = filterStockOptions;
    window.deleteZeroStock = deleteZeroStock;
  window.deleteStockItem = deleteStockItem;
  window.selectStockItem = selectStockItem;
  window.renderExportInvoiceTable = renderExportInvoiceTable;
  window.ensureHkdData = ensureHkdData;
  window.mergeDuplicateItems = mergeDuplicateItems;

  if (typeof closeInvoicePopup !== 'undefined') {
    window.closeInvoicePopup = closeInvoicePopup;
  }
}

window.showPopup = function(html, title = '', onClose = null) {
  // XÓA POPUP CŨ NẾU CÓ
  const oldWrapper = document.getElementById('invoicePopupWrapper');
  if (oldWrapper) oldWrapper.remove();

  // TẠO WRAPPER MỚI - FIXED + Z-INDEX CAO
  const wrapper = document.createElement('div');
  wrapper.id = 'invoicePopupWrapper';
  wrapper.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    overflow: auto;
  `;

  wrapper.innerHTML = `
    <div class="popup" style="
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      width: 90%;
      max-width: 1100px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    ">
      <div class="popup-header" style="
        padding: 16px 20px;
        background: #1976d2;
        color: white;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>${title}</div>
        <button onclick="window.closePopup()" style="
          background:none; border:none; color:white; font-size:1.5em; cursor:pointer; padding:0; width:30px; height:30px;
        ">×</button>
      </div>
      <div class="popup-body" style="flex:1; overflow:auto; padding:0;">
        ${html}
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  // HÀM ĐÓNG
  window.closePopup = function() {
    wrapper.remove();
    if (onClose) onClose();
  };

  // ĐÓNG KHI CLICK NỀN
  wrapper.addEventListener('click', function(e) {
    if (e.target === wrapper) window.closePopup();
  });
};

window.closePopup = function() {
  const wrapper = document.getElementById('invoicePopupWrapper');
  if (wrapper) wrapper.remove();
};
function closeStockSelector() {
  const popup = document.getElementById('stockSelectorPopup');
  if (popup) popup.remove();
}
function toggleInvoiceList(taxCode) {
  const list = document.getElementById(`mccqtList-${taxCode}`);
  if (!list) return;

  const isHidden = list.style.display === 'none' || !list.style.display;
  list.style.display = isHidden ? 'block' : 'none';
}
// Hàm xử lý upload file Excel xuất hàng
async function handleExcelExportFileUpload(taxCode, file) {
  if (!file) return;

  try {
    window.showToast(`Đang xử lý file ${file.name}...`, 2000, 'info');
    
    // Gọi hàm xử lý file Excel
    await handleExcelExportFile(file, taxCode);
    
    // Lưu dữ liệu và cập nhật giao diện
    window.saveDataToLocalStorage();
    renderExportInvoiceTable(taxCode);
    window.showToast(`✅ Đã nhập file Excel xuất hàng thành công cho HKD ${taxCode}`, 2000, 'success');
    
  } catch (err) {
    console.error('❌ Lỗi xử lý file Excel:', err);
    window.showToast(`❌ Lỗi xử lý file Excel: ${err.message}`, 3000, 'error');
  }
}
function updateMainTotalDisplay(taxCode) {
  const hkd = hkdData[taxCode];
  if (!hkd) return;

  // === 1. TỒN KHO HIỆN TẠI (THỰC TẾ) ===
  let currentQty = 0;
  let currentValue = 0;
  (hkd.tonkhoMain || []).forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    currentQty += qty;
    currentValue += qty * price;
  });

  // === 2. TỒN KHO MẶC ĐỊNH (BAN ĐẦU) ===
  let defaultQty = 0;
  let defaultValue = 0;

  if (hkd.tonkhoMainDefault) {
    defaultQty = parseFloat(hkd.tonkhoMainDefault.totalQty) || 0;
    defaultValue = parseFloat(hkd.tonkhoMainDefault.totalValue) || 0;
  } else {
    // Tính từ tồn hiện tại + tất cả lượng đã xuất (theo lịch sử khớp)
    (hkd.tonkhoMain || []).forEach(stock => {
      const qty = parseFloat(stock.quantity) || 0;
      const price = parseFloat(stock.price) || 0;

      let matchedOut = 0;
      (hkd.exports || []).forEach(exp => {
        (exp.items || []).forEach(item => {
          (item.matchedHistory || []).forEach(m => {
            // So sánh stockIdx hoặc dùng fallback nếu chưa có
            if (m.stockIdx === stock.stockIdx || 
                m.stockIdx === stock.index || 
                (m.name && m.name === stock.name)) {
              matchedOut += parseFloat(m.qty || 0);
            }
          });
        });
      });

      defaultQty += qty + matchedOut;
      defaultValue += (qty + matchedOut) * price;
    });

    // Lưu lại để lần sau dùng nhanh
    hkd.tonkhoMainDefault = {
      totalQty: defaultQty.toFixed(6),
      totalValue: defaultValue.toFixed(2)
    };
  }

  // === 3. ĐÃ GIẢM ===
  const reducedQty = defaultQty - currentQty;
  const reducedValue = defaultValue - currentValue;

  // === 4. XUẤT HÀNG ===
  let totalExpQty = 0;
  let totalSellValue = 0;
  let totalCostValue = 0;

  (hkd.exports || []).forEach(exp => {
    (exp.items || []).forEach(item => {
      const matchedQty = (item.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);
      if (matchedQty <= 0) return;

      totalExpQty += matchedQty;
      totalSellValue += matchedQty * parseFloat(item.price || 0);

      (item.matchedHistory || []).forEach(m => {
        totalCostValue += parseFloat(m.qty || 0) * parseFloat(m.priceInput || 0);
      });
    });
  });

  // === 5. CẬP NHẬT GIAO DIỆN ===
  if (currentTaxCode === taxCode) {
    const el = (id) => document.getElementById(id);
    if (el('inv-qty')) el('inv-qty').textContent = formatQuantity(currentQty);
    if (el('inv-value')) el('inv-value').textContent = window.formatCurrencyVN(currentValue);
    if (el('inv-default-value')) el('inv-default-value').textContent = window.formatCurrencyVN(defaultValue);
    if (el('inv-reduced-value')) el('inv-reduced-value').textContent = window.formatCurrencyVN(reducedValue);

    if (el('exp-items')) el('exp-items').textContent = formatQuantity(totalExpQty);
    if (el('exp-revenue-sell')) el('exp-revenue-sell').textContent = window.formatCurrencyVN(totalSellValue);
    if (el('exp-revenue-cost')) el('exp-revenue-cost').textContent = window.formatCurrencyVN(totalCostValue);
  }

  console.log('BÁO CÁO TỒN KHO:', {
    'SL hiện tại': currentQty,
    'Tiền hiện tại': currentValue,
    'Tiền mặc định': defaultValue,
    'Đã giảm (tiền)': reducedValue,
    'Doanh thu': totalSellValue,
    'Giá vốn': totalCostValue
  });
}
function validateCalculations(taxCode) {
  console.log('=== KIỂM TRA TÍNH TOÁN ===', taxCode);
  
  const hkd = hkdData[taxCode];
  if (!hkd) {
    console.log('Không có dữ liệu HKD');
    return;
  }
  
  // Kiểm tra tồn kho
  console.log('TỒN KHO:');
  if (!hkd.tonkhoMain || hkd.tonkhoMain.length === 0) {
    console.log('Không có tồn kho');
  } else {
    hkd.tonkhoMain.forEach((item, index) => {
      const calculatedAmount = parseFloat(item.quantity) * parseFloat(item.price);
      const amountDiff = Math.abs(calculatedAmount - parseFloat(item.amount));
      console.log(`${index + 1}. ${item.name}: SL=${item.quantity}, Giá=${item.price}, TT=${item.amount}, TT tính=${calculatedAmount}, Sai số=${amountDiff}`);
    });
  }
  
  // Kiểm tra xuất hàng
  console.log('XUẤT HÀNG:');
  if (!hkd.exports || hkd.exports.length === 0) {
    console.log('Không có xuất hàng');
  } else {
    hkd.exports.forEach((exp, expIdx) => {
      console.log(`Export ${expIdx + 1}:`);
      if (!exp.items || exp.items.length === 0) {
        console.log('  Không có items');
      } else {
        exp.items.forEach((item, itemIdx) => {
          const calculatedAmount = parseFloat(item.qty) * parseFloat(item.price);
          const amountDiff = Math.abs(calculatedAmount - parseFloat(item.amount));
          console.log(`  ${itemIdx + 1}. ${item.name}: SL=${item.qty}, Giá=${item.price}, TT=${item.amount}, TT tính=${calculatedAmount}, Sai số=${amountDiff}`);
        });
        
        const calculatedTotal = exp.items.reduce((sum, it) => sum + parseFloat(it.amount || 0), 0);
        const totalDiff = Math.abs(calculatedTotal - parseFloat(exp.total || 0));
        console.log(`  Tổng: ${exp.total}, Tổng tính: ${calculatedTotal}, Sai số: ${totalDiff}`);
      }
    });
  }
  
  console.log('=== KẾT THÚC KIỂM TRA ===');
}
// Hàm tính độ tương đồng mờ (fuzzy score) - 0 đến 1
function fuzzyScore(s1, s2) {
  s1 = removeVietnameseAccents(s1.toLowerCase());
  s2 = removeVietnameseAccents(s2.toLowerCase());
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  let matches = 0;
  let i = 0, j = 0;
  while (i < s1.length && j < s2.length) {
    if (s1[i] === s2[j]) {
      matches++;
      i++; j++;
    } else {
      i++;
    }
  }
  return (2.0 * matches) / (s1.length + s2.length);
}
function openStockSelector(taxCode, expIdx, originalIndex) {
  const stock = hkdData[taxCode]?.tonkhoMain || [];
  if (!stock?.length) {
    window.showToast('Không có hàng tồn kho!', 2000, 'error');
    return;
  }

  const exp = hkdData[taxCode].exports[expIdx];
  const item = exp.items[originalIndex];

  let options = '';
  let availableStockCount = 0;

  // Hiển thị TOÀN BỘ tồn kho còn hàng
  stock.forEach((s, i) => {
    if (parseFloat(s.quantity) <= 0) return;
    
    availableStockCount++;
    
    options += `
      <div onclick="selectStockItem('${taxCode}', ${expIdx}, ${originalIndex}, ${i})"
           class="stock-option-item"
           data-name="${removeVietnameseAccents(s.name.toLowerCase())}"
           style="padding:12px; border-bottom:1px solid #eee; cursor:pointer; transition:0.2s;"
           onmouseover="this.style.background='#f5f5f5'"
           onmouseout="this.style.background='transparent'">
        <div style="font-weight:600;">${s.name}</div>
        <div style="font-size:0.9em; color:#555; margin-top:4px;">
          Mã: <b>${s.productCode || 'N/A'}</b> | 
          SL còn: <b>${parseFloat(s.quantity).toFixed(2)}</b> ${s.unit} | 
          Giá: <b>${window.formatCurrencyVN(s.price)}</b>
        </div>
      </div>`;
  });

  const popup = document.createElement('div');
  popup.id = 'stockSelectorPopup';
  popup.style.cssText = `
    position: fixed;
    top: 10%;
    left: 10%;
    width: 80%;
    height: 80%;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  popup.innerHTML = `
    <div style="background:#1976d2; color:white; padding:16px 20px; font-size:1.2em; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
      <div>Chọn hàng tồn kho cho: <i style="font-weight:normal;">${item.name}</i></div>
      <button onclick="closeStockSelector()" style="background:none; border:none; color:white; font-size:1.5em; cursor:pointer;">×</button>
    </div>

    <div style="padding:16px; border-bottom:1px solid #eee;">
      <input type="text" id="stockSearchInput" placeholder="Tìm nhanh theo tên, mã..." 
             style="width:100%; padding:12px; font-size:1em; border:1px solid #ccc; border-radius:6px;"
             onkeyup="filterStockOptions(this.value)">
    </div>

    <div id="stockOptionsContainer" style="flex:1; overflow-y:auto; padding:0 16px;">
      <div style="padding:8px 0; color:#777; font-style:italic;">
        ${availableStockCount > 0 ? `Có ${availableStockCount} tồn kho có hàng` : 'Không có hàng tồn kho.'}
      </div>
      ${options}
    </div>

    <div style="padding:16px; text-align:right; border-top:1px solid #eee; background:#f9f9f9;">
      <button onclick="closeStockSelector()" style="padding:10px 20px; background:#ccc; color:black; border:none; border-radius:6px; cursor:pointer;">
        Đóng
      </button>
    </div>
  `;

  document.body.appendChild(popup);
  setTimeout(() => document.getElementById('stockSearchInput')?.focus(), 100);
}

// ====== KÉO THẢ GỘP TRONG CÙNG BẢNG XUẤT HÀNG (DEMO POPUP HOẠT ĐỘNG) ======

let draggedItemId = null;

function handleDragStart(e) {
  const el = e.target.closest(".match-item");
  if (!el) return;
  draggedItemId = el.dataset.id;
  e.dataTransfer.setData("text/plain", draggedItemId);
  el.classList.add("dragging");
  console.log("🎯 Drag start:", draggedItemId);
}

function handleDragOver(e) {
  e.preventDefault(); // PHẢI CÓ DÒNG NÀY ĐỂ DROP HOẠT ĐỘNG
  const target = e.target.closest(".match-item");
  if (!target || target.dataset.id === draggedItemId) return;
  target.classList.add("drag-over");
}

function handleDragLeave(e) {
  const target = e.target.closest(".match-item");
  if (target) target.classList.remove("drag-over");
}

function handleMergeDropPreview(e) {
  e.preventDefault();
  const target = e.target.closest(".match-item");
  if (!target || target.dataset.id === draggedItemId) return;

  const dragged = document.querySelector(`.match-item[data-id="${draggedItemId}"]`);
  if (!dragged) return;

  const nameA = dragged.querySelector("b")?.textContent.trim() || "(không rõ)";
  const nameB = target.querySelector("b")?.textContent.trim() || "(không rõ)";

  target.classList.remove("drag-over");
  dragged.classList.remove("dragging");

  console.log(`📎 [DROP] from: ${nameA} → to: ${nameB}`);

  // Popup demo xác nhận gộp
  showMergeConfirmPopup(nameA, nameB);
}

function showMergeConfirmPopup(nameA, nameB) {
  const html = `
    <div style="padding:20px; text-align:center;">
      <h3 style="margin-bottom:10px; color:#1976d2;">Gộp sản phẩm</h3>
      <p>Bạn có muốn <strong>gộp</strong> "<span style="color:#333">${nameA}</span>" vào "<span style="color:#333">${nameB}</span>" không?</p>
      <p style="margin-top:12px; font-size:0.9em; color:#666;">(Chức năng demo – chưa gộp dữ liệu thật)</p>
      <div style="margin-top:20px;">
        <button onclick="closeMiniPopup()" style="padding:8px 16px; background:#1976d2; color:#fff; border:none; border-radius:6px; cursor:pointer;">Xác nhận</button>
        <button onclick="closeMiniPopup()" style="padding:8px 16px; background:#ccc; border:none; border-radius:6px; cursor:pointer; margin-left:8px;">Hủy</button>
      </div>
    </div>
  `;
  if (window.showPopup) {
    window.showPopup(html, "Xác nhận gộp", 400);
  } else {
    // Fallback nếu chưa có showPopup
    const div = document.createElement("div");
    div.innerHTML = html;
    div.style.position = "fixed";
    div.style.top = "50%";
    div.style.left = "50%";
    div.style.transform = "translate(-50%, -50%)";
    div.style.background = "#fff";
    div.style.border = "1px solid #ccc";
    div.style.borderRadius = "8px";
    div.style.zIndex = "9999";
    div.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
    document.body.appendChild(div);
  }
}

function closeMiniPopup() {
  if (window.closePopup) {
    window.closePopup();
  } else {
    // Fallback xóa popup thủ công
    const lastDiv = document.body.lastElementChild;
    if (lastDiv) lastDiv.remove();
  }
}

// ====== CSS BỔ TRỢ ======
const style = document.createElement("style");
style.innerHTML = `
  .match-item.dragging {
    opacity: 0.6;
    border: 2px dashed #42a5f5;
  }
  .match-item.drag-over {
    background-color: #e3f2fd !important;
    border: 2px solid #1976d2 !important;
  }
`;
document.head.appendChild(style);


document.addEventListener('DOMContentLoaded', initApp);