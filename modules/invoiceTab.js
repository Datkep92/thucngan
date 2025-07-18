function renderInvoiceTab(taxCode) {
  const hkd = hkdData[taxCode];
  const invoices = hkd.invoices || [];

  const containerId = `${taxCode}-invoiceTablePlaceholder`;
  const container = document.getElementById(containerId);
  if (!container) return;

  if (invoices.length === 0) {
    container.innerHTML = `<p>Chưa có hóa đơn đầu vào nào.</p>`;
    return;
  }

  let html = `
    <table class="invoice-table" border="1" cellspacing="0" cellpadding="6" style="width:100%; margin-top:10px; background:#fff;">
      <thead style="background:#3498db; color:white;">
        <tr>
          <th>STT</th>
          <th>Mã hóa đơn</th>
          <th>Ngày</th>
          <th>Tiền XML</th>
          <th>Tính lại</th>
          <th>Chiết khấu</th>
          <th>Thanh toán</th>
          <th>Trạng thái</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
  `;

  invoices.forEach((inv, idx) => {
    const beforeTax = inv.totals?.beforeTax || 0;               // ✅ Tiền XML (tính lại)
    const xmlDeclared = inv.totals?.xmlDeclared || 0;           // ✅ Tính lại (từ XML khai báo)
    const discount = inv.totals?.discount || 0;                 // ✅ Chiết khấu thương mại
    const finalTotal = inv.totals?.TgTCThue || 0;               // ✅ Tổng thanh toán

    const status = Math.abs(finalTotal - beforeTax) < 1000 // hoặc < 1 nếu làm tròn
  ? '<span style="color:green;">✅ Đúng</span>'
  : '<span style="color:red;">❌ Sai</span>';


    html += `
      <tr>
        <td>${idx + 1}</td>
        <td>${inv.invoiceInfo?.number || '-'}</td>
        <td>${inv.invoiceInfo?.date || '-'}</td>
         <td>${formatCurrencyVN(finalTotal)}</td>    <!-- Đúng: Tổng tiền hàng trong XML -->
        <td>${formatCurrencyVN(beforeTax)}</td>       <!-- Tổng tiền tính lại -->
        <td>${formatCurrencyVN(discount)}</td>        <!-- Tổng chiết khấu -->
        <td>${formatCurrencyVN(xmlDeclared)}</td>      <!-- Tổng tiền phải thanh toán -->
        <td>${status}</td>
        <td>
          <button onclick="openInvoiceViewer(hkdData['${taxCode}'].invoices[${idx}], '${taxCode}', ${idx})">👁️ Xem</button>
          <button onclick="deleteInvoice('${taxCode}', ${idx})">❌ Xóa</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}


function openInvoiceViewer(invoice, taxCode, index) {
  if (!invoice || !hkdData[taxCode]) {
    showToast('❌ Dữ liệu hóa đơn không hợp lệ', 3000, 'error');
    return;
  }

  const products = invoice.products || [];
  const url = invoice.htmlUrl || '';

  let totalBeforeTax = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  products.forEach(p => {
    const quantity = parseFloat(p.quantity) || 0;
    const price = parseFloat(p.price) || 0;
    const taxRate = parseFloat(p.taxRate) || 0;

    const amount = quantity * price;
    const tax = amount * (taxRate / 100);

    if (p.category === 'chiet_khau') {
      totalDiscount += Math.abs(p.amount);
    } else {
      totalBeforeTax += amount;
      totalTax += tax;
    }
  });

  const totalPayment = totalBeforeTax + totalTax - totalDiscount;

  let html = `
    <div class="split-view">
      <div class="left-pane">
        ${url ? `<iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>` : '<p>Không có URL hóa đơn</p>'}
      </div>
      <div class="right-pane">
        <h4>📦 Bảng kê hàng hóa</h4>
        <table class="invoice-products" border="1" cellspacing="0" cellpadding="4" style="width:100%;">
          <thead>
            <tr>
              <th>STT</th><th>Tên</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>CK</th><th>Thuế</th><th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>`;

  products.forEach((p, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name || '-'}</td>
        <td>${p.unit || '-'}</td>
        <td>${p.quantity || 0}</td>
        <td>${formatCurrencyVN(p.price || 0)}</td>
        <td>${formatCurrencyVN(p.discount || 0)}</td>
        <td>${p.taxRate || 0}%</td>
        <td>${formatCurrencyVN(p.amount || 0)}</td>
      </tr>`;
  });

  html += `</tbody></table><br>
    <div><b>🧾 Tổng hàng hóa:</b> ${formatCurrencyVN(totalBeforeTax)} đ</div>
    <div><b>💸 Thuế (tính thủ công):</b> ${formatCurrencyVN(totalTax)} đ</div>
    <div><b>📦 Phí khác:</b> 0 đ</div>
    <div><b>🎁 Chiết khấu:</b> ${formatCurrencyVN(totalDiscount)} đ</div>
    <div style="margin-top:8px; font-weight:bold; color:green;">💰 Tổng thanh toán: ${formatCurrencyVN(totalPayment)} đ</div>
    <div class="popup-nav" style="margin-top:12px;">
      <button onclick="navigateInvoice(-1)">🔼 Trước</button>
      <button onclick="navigateInvoice(1)">🔽 Tiếp</button>
    </div>
  </div>
</div>`;

  showPopup(html, `🧾 Hóa đơn ${invoice.invoiceInfo?.number || '-'}`, () => {
    window.currentInvoiceIndex = null;
    window.currentInvoiceTaxCode = null;
  });

  window.currentInvoiceIndex = index;
  window.currentInvoiceTaxCode = taxCode;
}

function navigateInvoice(dir) {
  const taxCode = window.currentInvoiceTaxCode;
  let index = window.currentInvoiceIndex + dir;
  const list = hkdData[taxCode].invoices;

  if (index < 0 || index >= list.length) {
    toast('🚫 Không còn hóa đơn');
    return;
  }

  closeInvoicePopup();
  openInvoiceViewer(list[index], taxCode, index);
}

function createTonKhoItem(taxCode, type) {
  const name = prompt("Tên sản phẩm:");
  if (!name || name.trim() === '') {
    showToast('❌ Tên sản phẩm không được để trống', 3000, 'error');
    return;
  }

  const unit = prompt("Đơn vị tính:", "cái") || "";
  const quantity = parseFloat(prompt("Số lượng:", "1") || "0");
  if (isNaN(quantity) || quantity < 0) {
    showToast('❌ Số lượng phải là số không âm', 3000, 'error');
    return;
  }

  const price = parseFloat(prompt("Đơn giá:", "0") || "0");
  if (isNaN(price) || price < 0) {
    showToast('❌ Đơn giá phải là số không âm', 3000, 'error');
    return;
  }

  const taxRate = prompt("Thuế suất (%):", "0") || "0";
  if (isNaN(parseFloat(taxRate)) || parseFloat(taxRate) < 0) {
    showToast('❌ Thuế suất phải là số không âm', 3000, 'error');
    return;
  }

  const item = {
    name: name.trim(),
    unit,
    quantity: quantity.toString(),
    price: price.toString(),
    amount: parseFloat((quantity * price).toFixed(2)),
    taxRate,
    category: type === 'main' ? 'hang_hoa' : (type === 'km' ? 'KM' : 'chiet_khau')
  };

  const key = type === 'main' ? 'tonkhoMain' : (type === 'km' ? 'tonkhoKM' : 'tonkhoCK');
  hkdData[taxCode][key].push(item);
  updateMainTotalDisplay(taxCode);
  renderTonKhoTab(taxCode, type);
  saveDataToLocalStorage();
  renderHKDTab(taxCode);
}

function closeInvoicePopup() {
  const wrapper = document.getElementById('invoicePopupWrapper');
  if (wrapper) {
    wrapper.remove();
  }
  window.currentInvoiceIndex = null;
  window.currentInvoiceTaxCode = null;
}

// Gắn hàm vào window để sử dụng toàn cục
window.closeInvoicePopup = closeInvoicePopup;
function deleteInvoice(taxCode, index) {
  if (!confirm('❌ Bạn chắc chắn muốn xóa hóa đơn này?')) return;
  hkdData[taxCode].invoices.splice(index, 1);
  saveDataToLocalStorage();
  renderInvoiceTab(taxCode);
  toast('🗑️ Đã xóa hóa đơn');
}
