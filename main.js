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

      exportHtml += `
        <div class="match-item" 
             draggable="true"
             data-type="export"
             data-expidx="${expIdx}"
             data-itemidx="${itemIdx}"
             data-search="${(item.name + ' ' + item.unit + ' ' + (exp.invoiceInfo?.mccqt || '')).toLowerCase()}"
             ondragstart="dragStart(event)">
          <div><b>${item.name}</b></div>
          <div class="qty">SL: ${formatQuantity(remainingQty)} ${item.unit || ''}</div>
          <div class="source">Từ: ${exp.invoiceInfo?.mccqt || 'Excel'}</div>
        </div>`;
    });
  });

  // === TỒN KHO CÒN HÀNG ===
  (hkd.tonkhoMain || []).forEach((stock, stockIdx) => {
    const qty = parseFloat(stock.quantity) || 0;
    if (qty <= 0) return;

    stockHtml += `
      <div class="match-item" 
           data-type="stock"
           data-stockidx="${stockIdx}"
           data-search="${(stock.name + ' ' + stock.unit + ' ' + window.formatCurrencyVN(stock.price)).toLowerCase()}"
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

    <div class="match-content">
      <div class="match-column">
        <h4>Xuất Hàng (Chưa Khớp)</h4>
        <div id="exportItemsList" class="match-list">${exportHtml}</div>
      </div>
      <div class="match-arrow">→</div>
      <div class="match-column">
        <h4>Tồn Kho (Còn Hàng)</h4>
        <div id="stockItemsList" class="match-list">${stockHtml}</div>
      </div>
    </div>

    <div class="popup-footer" style="padding:16px; text-align:right; border-top:1px solid #eee; background:#f9f9f9;">
      <button onclick="confirmAllMatches()" style="padding:10px 20px; background:#1976d2; color:white; border:none; border-radius:6px; cursor:pointer; margin-left:8px;">
        Xác Nhận Tất Cả
      </button>
      <button onclick="closeMatchPopup()" style="padding:10px 20px; background:#ccc; color:black; border:none; border-radius:6px; cursor:pointer;">
        Hủy
      </button>
    </div>
  `;

  window.showPopup(popupHtml, 'Khớp Tồn Kho - Kéo Thả', () => {
    currentTaxCode = '';
  });

  // Focus vào ô tìm kiếm ngay khi mở
  setTimeout(() => {
    document.getElementById('globalSearchInput')?.focus();
  }, 100);
}
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

      // Đảm bảo HKD tồn tại và KHÔNG xóa dữ liệu cũ
      ensureHkdData(taxCode);
      
      // Cập nhật tên nếu chưa có
      if (!hkdData[taxCode].name || hkdData[taxCode].name === taxCode) {
        hkdData[taxCode].name = name;
      }

      // Tránh MCCQT trùng lặp (chỉ kiểm tra trong invoices của HKD này)
      const exists = (hkdData[taxCode]?.invoices || []).some(
        inv => (inv.invoiceInfo?.mccqt || '') === mccqt
      );
      if (exists) {
        window.showToast(`⚠️ Bỏ qua MCCQT trùng: ${mccqt}`, 3000, 'info');
        continue;
      }

      // Lưu hóa đơn gốc - THÊM vào mảng hiện có, không ghi đè
      hkdData[taxCode].invoices.push(invoice);

      // Gán sản phẩm từ invoice → tồn kho phù hợp - THÊM vào tồn kho hiện tại
      invoice.products.forEach(p => {
        const entry = {
          ...p,
          lineDiscount: parseFloat(p.lineDiscount || 0),
          invoiceDate: invoice.invoiceInfo?.date || '',
          mccqt: invoice.invoiceInfo?.mccqt || '',
          taxCode: taxCode // Thêm taxCode để xác định thuộc HKD nào
        };
        const arr = entry.category === 'hang_hoa' ? 'tonkhoMain' :
                    entry.category === 'KM' ? 'tonkhoKM' : 'tonkhoCK';
        hkdData[taxCode][arr].push(entry);
      });

      // ✅ Ghi log sau khi xử lý
      window.logAction(`✅ Nhập xong hóa đơn ${invoice.invoiceInfo.number} cho HKD ${taxCode}`, JSON.parse(JSON.stringify(hkdData)));

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
    const lastTaxCode = hkdOrder[hkdOrder.length - 1];
    window.renderHKDTab(lastTaxCode);
  }

  window.showToast('✅ Đã xử lý xong tất cả file hóa đơn', 2000, 'success');
}

// Hàm xử lý file Excel xuất hàng - LƯU THEO HKD
async function handleExcelExportFile(file, taxCode) {
  try {
    const data = await readExcelFile(file);
    if (!data || data.length === 0) {
      throw new Error('File Excel không có dữ liệu');
    }

    // Đảm bảo HKD tồn tại
    ensureHkdData(taxCode);

    // Tạo export record từ dữ liệu Excel
    const exportRecord = {
      type: 'export',
      exportDate: new Date().toISOString().split('T')[0],
      invoiceInfo: {
        mccqt: `EXCEL_${Date.now()}`,
        date: new Date().toISOString().split('T')[0]
      },
      items: [],
      total: 0,
      customer: {
        name: 'Nhập từ Excel',
        taxCode: 'EXCEL_IMPORT'
      },
      source: 'excel',
      fileName: file.name,
      taxCode: taxCode // Quan trọng: lưu HKD của export này
    };

    let totalAmount = 0;

    // Xử lý từng dòng trong Excel
    data.forEach((row, index) => {
      const name = row['Mặt Hàng'] || row['Tên hàng'] || '';
      const quantity = parseFloat(row['Số lượng'] || row['SL'] || 0);
      const price = parseFloat(row['Đơn giá'] || row['Giá'] || 0);
      const amount = parseFloat(row['Thành tiền'] || row['Doanh số bán chưa có thuế'] || (quantity * price));

      if (name && quantity > 0) {
        const item = {
          code: row['Mã hàng'] || `EXCEL_${index + 1}`,
          name: name,
          unit: row['ĐVT'] || row['Đơn vị tính'] || '',
          qty: quantity,
          price: price,
          amount: amount,
          taxRate: 0,
          priceInput: 0,
          category: 'hang_hoa',
          matched: false,
          manualMatched: false,
          taxCode: taxCode // Lưu HKD cho từng item
        };

        exportRecord.items.push(item);
        totalAmount += amount;
      }
    });

    exportRecord.total = totalAmount;

    // THÊM vào danh sách exports của HKD - không ghi đè
    if (!hkdData[taxCode].exports) {
      hkdData[taxCode].exports = [];
    }
    hkdData[taxCode].exports.push(exportRecord);

    // TỰ ĐỘNG KHỚP + GIẢM TỒN KHO CỦA HKD NÀY
    autoMatchAndDeduct(taxCode, exportRecord);

    window.logAction(`✅ Nhập xong file Excel xuất hàng ${file.name} cho HKD ${taxCode}`, JSON.parse(JSON.stringify(hkdData)));
    return exportRecord;

  } catch (err) {
    console.error('❌ Lỗi xử lý file Excel:', err);
    throw err;
  }
}

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

  let html = `<h3 style="margin:15px 0 10px; font-weight:bold; color:#1976d2;">Xuất Hàng - HKD ${taxCode}</h3>`;

  // NÚT MỚI: KHỚP TỒN KHO BẰNG KÉO THẢ
  html += `
    <div style="margin: 20px 0; text-align: center;">
      <button onclick="openMatchByDragPopup('${taxCode}')" 
              style="padding: 12px 28px; font-size: 1.1em; background: #1976d2; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        Khớp Tồn Kho Bằng Kéo Thả
      </button>
    </div>`;

  hkd.exports.forEach((exp, expIdx) => {
    const sourceBadge = exp.source === 'excel' 
      ? `<span style="background:#28a745; color:white; padding:3px 7px; border-radius:4px; font-size:0.8em; margin-left:8px;">EXCEL</span>` 
      : '';

    html += `
      <div style="border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:15px; background:#fafafa;">
        <div style="font-weight:bold; color:#d32f2f; display:flex; justify-content:space-between;">
          <span>${exp.invoiceInfo?.mccqt || 'N/A'} ${sourceBadge}</span>
          <span style="color:#1976d2;">${window.formatCurrencyVN(exp.total)}</span>
        </div>

        <table style="width:100%; margin-top:10px; background:#fff; font-size:0.9em; border-collapse:collapse;">
          <thead style="background:#e3f2fd;">
            <tr>
              <th style="padding:8px; border:1px solid #ddd;">STT</th>
              <th>Mã SP</th><th>Tên hàng</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>`;

    // Gộp item trùng trước khi hiển thị
    const mergedItems = mergeDuplicateItems(exp.items);

    mergedItems.forEach((item, displayIdx) => {
      const originalIndex = item.originalIndex;
      const remainingQty = parseFloat(item.qty) || 0;
      const isMatched = (item.matchedHistory?.length > 0);
      const matchedQty = (item.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);
      const displayQty = remainingQty > 0 ? remainingQty : matchedQty;

      html += `
        <tr style="${remainingQty <= 0 ? 'opacity:0.6;' : ''}">
          <td>${displayIdx + 1}</td>
          <td>${item.code || ''}</td>
          <td>${item.name || ''}</td>
          <td>${item.unit || ''}</td>
          <td>${formatQuantity(displayQty)}</td>
          <td>${window.formatCurrencyVN(item.price)}</td>
          <td>${window.formatCurrencyVN(item.amount)}</td>
          <td>
            ${remainingQty > 0 ? 
              `<button onclick="openStockSelector('${taxCode}', ${expIdx}, ${originalIndex})" 
                       style="padding:4px 8px; font-size:0.8em;">Chọn TK</button>` 
              : '<span style="color:#2e7d32;">Đã xuất</span>'
            }
          </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
  });

  placeholder.innerHTML = html;
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
function autoMatchAndDeduct(taxCode, exportRecord) {
  const hkd = hkdData[taxCode];
  if (!hkd || !hkd.tonkhoMain?.length) return;

  console.log('=== TỰ ĐỘNG KHỚP TỒN KHO - NGĂN TRÙNG LẶP ===', taxCode);

  // Tạo map tồn kho để tìm kiếm nhanh
  const stockMap = new Map();
  hkd.tonkhoMain.forEach((stock, idx) => {
    const key = stock.name.trim().toLowerCase();
    stockMap.set(key, { 
      ...stock, 
      originalIndex: idx,
      originalQuantity: parseFloat(stock.quantity), // Lưu số lượng gốc
      alreadyProcessed: false // Đánh dấu đã xử lý
    });
  });

  let totalDeducted = 0;
  const processedItems = new Set(); // Theo dõi items đã xử lý

  // Xử lý từng item trong xuất hàng
  exportRecord.items.forEach((item, itemIndex) => {
    // Bỏ qua nếu đã xử lý thủ công hoặc đã xử lý trong auto match
    if (item.manualMatched || processedItems.has(itemIndex)) return;

    const itemName = item.name.trim().toLowerCase();
    const stockItem = stockMap.get(itemName);

    // Chỉ xử lý nếu tên trùng 100%, còn tồn kho và chưa xử lý
    if (stockItem && parseFloat(stockItem.quantity) > 0 && !stockItem.alreadyProcessed) {
      const qtyNeed = parseFloat(item.qty) || 0;
      const qtyAvail = parseFloat(stockItem.quantity) || 0;
      
      if (qtyNeed > 0) {
        const actualQtyToDeduct = Math.min(qtyNeed, qtyAvail);
        totalDeducted += actualQtyToDeduct;

        // CẬP NHẬT TỒN KHO TRONG hkdData
        const stockIndex = stockItem.originalIndex;
        const newStockQty = (qtyAvail - actualQtyToDeduct).toFixed(6);
        const newStockAmount = (parseFloat(newStockQty) * parseFloat(stockItem.price)).toFixed(2);
        
        hkd.tonkhoMain[stockIndex].quantity = newStockQty;
        hkd.tonkhoMain[stockIndex].amount = newStockAmount;

        // ĐÁNH DẤU ĐÃ XỬ LÝ để không bị trùng
        stockItem.alreadyProcessed = true;
        stockItem.quantity = newStockQty; // Cập nhật số lượng mới
        processedItems.add(itemIndex); // Đánh dấu item đã xử lý

        console.log('🔧 CẬP NHẬT TỒN KHO (KHÔNG TRÙNG):', {
          name: hkd.tonkhoMain[stockIndex].name,
          oldQty: qtyAvail,
          newQty: newStockQty,
          deducted: actualQtyToDeduct,
          itemIndex: itemIndex
        });

        // Cập nhật item xuất hàng
        const newItemQty = (qtyNeed - actualQtyToDeduct).toFixed(6);
        const newItemAmount = (parseFloat(newItemQty) * parseFloat(item.price)).toFixed(2);
        
        item.qty = newItemQty;
        item.amount = newItemAmount;
        item.priceInput = parseFloat(stockItem.price);
        item.autoMatched = true;

        // Ghi lịch sử
        if (!item.matchedHistory) item.matchedHistory = [];
        item.matchedHistory.push({
          stockIdx: stockIndex,
          qty: actualQtyToDeduct,
          priceInput: parseFloat(stockItem.price),
          timestamp: new Date().toISOString(),
          auto: true
        });

        console.log(`✅ Tự động: ${item.name} - Trừ ${actualQtyToDeduct}`);
      }
    }
  });

  // Cập nhật tổng tiền
  exportRecord.total = exportRecord.items.reduce((sum, it) => sum + parseFloat(it.amount || 0), 0).toFixed(2);

  // Lưu và cập nhật giao diện
  window.saveDataToLocalStorage();
  renderExportInvoiceTable(taxCode);
  window.renderTonKhoTab(taxCode, 'main');
  updateMainTotalDisplay(taxCode);
  
  console.log('=== HOÀN TẤT TỰ ĐỘNG KHỚP - KHÔNG TRÙNG ===', {
    totalDeducted: totalDeducted,
    processedItems: processedItems.size
  });
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

  /* ---------- 1. TỒN KHO ---------- */
  const totalInvQty = (hkd.tonkhoMain || []).reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  const totalInvValue = (hkd.tonkhoMain || []).reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.price || 0)), 0);

  /* ---------- 2. XUẤT HÀNG: TÍNH CHÍNH XÁC ---------- */
  let totalExpQty = 0;
  let totalExpValue = 0;

  (hkd.exports || []).forEach(exp => {
    (exp.items || []).forEach(item => {
      // CHỈ TÍNH số lượng đã thực sự trừ tồn kho
      const matchedQty = (item.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);
      if (matchedQty > 0) {
        totalExpQty += matchedQty;
        totalExpValue += matchedQty * parseFloat(item.priceInput || item.price || 0);
      }
    });
  });

  /* ---------- 3. HTML KHUNG ---------- */
  const html = `
    <!-- Tabs -->
    <div class="tabs">
      <div class="tab active"   onclick="openTab(event,'${taxCode}-tonkho')">Tồn kho</div>
      <div class="tab"          onclick="openTab(event,'${taxCode}-xuathang')">Xuất Hàng</div>
    </div>

    <!-- TAB TỒN KHO -->
    <div id="${taxCode}-tonkho" class="tab-content active hkd-section">
      <div class="summary-grid" style="margin-bottom: 20px;">
        <div class="summary-box">
          <div class="label">Tổng SL tồn kho</div>
          <div class="value" id="inv-qty">${totalInvQty.toFixed(2)}</div>
        </div>
        <div class="summary-box">
          <div class="label">Tổng tiền tồn kho</div>
          <div class="value" id="inv-value">${window.formatCurrencyVN(totalInvValue)}</div>
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
      <div class="summary-grid" style="margin-bottom: 20px;">
        <div class="summary-box">
          <div class="label">Tổng SL đã xuất</div>
          <div class="value" id="exp-items">${formatQuantity(totalExpQty)}</div>
        </div>
        <div class="summary-box">
          <div class="label">Tổng tiền đã xuất</div>
          <div class="value" id="exp-revenue">${window.formatCurrencyVN(totalExpValue)}</div>
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

  /* ---------- 4. RENDER TAB MẶC ĐỊNH ---------- */
  window.renderTonKhoTab(taxCode, 'main');
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

  // === TỒN KHO ===
  const totalInvQty = (hkd.tonkhoMain || []).reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  const totalInvValue = (hkd.tonkhoMain || []).reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.price || 0)), 0);

  // === XUẤT HÀNG: TÍNH CHÍNH XÁC SỐ LƯỢNG ĐÃ THỰC SỰ XUẤT ===
  let totalExpQty = 0;
  let totalExpValue = 0;

  (hkd.exports || []).forEach(exp => {
    (exp.items || []).forEach(item => {
      // CHỈ TÍNH số lượng đã thực sự trừ tồn kho (matchedHistory)
      const matchedQty = (item.matchedHistory || []).reduce((s, m) => s + parseFloat(m.qty || 0), 0);
      if (matchedQty > 0) {
        totalExpQty += matchedQty; // Chỉ cộng số lượng đã trừ
        totalExpValue += matchedQty * parseFloat(item.priceInput || item.price || 0);
      }
    });
  });

  console.log('THỐNG KÊ CHÍNH XÁC:', {
    totalInvQty,
    totalExpQty,
    totalExpValue,
    exportsCount: hkd.exports?.length || 0
  });

  // === CẬP NHẬT GIAO DIỆN ===
  if (currentTaxCode === taxCode) {
    const el = (id) => document.getElementById(id);
    
    // Tồn kho
    if (el('inv-qty')) el('inv-qty').textContent = totalInvQty.toFixed(2);
    if (el('inv-value')) el('inv-value').textContent = window.formatCurrencyVN(totalInvValue);

    // Xuất hàng - SỬA NHÃN CHO RÕ
    if (el('exp-items')) el('exp-items').textContent = formatQuantity(totalExpQty);
    if (el('exp-revenue')) el('exp-revenue').textContent = window.formatCurrencyVN(totalExpValue);
  }
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
document.addEventListener('DOMContentLoaded', initApp);