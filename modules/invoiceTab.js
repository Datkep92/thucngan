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
  const products = invoice.products || [];
  const url = invoice.htmlUrl || '';

  let totalBeforeTax = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  // Tính lại từng dòng hàng hóa
  products.forEach(p => {
    const quantity = parseFloat(p.quantity) || 0;
    const price = parseFloat(p.price) || 0;
    const taxRate = parseFloat(p.taxRate) || 0;

    const amount = quantity * price;
    const tax = amount * (taxRate / 100);

    if (p.category === 'chiet_khau') {
      totalDiscount += Math.abs(p.amount); // Chiết khấu luôn âm
    } else {
      totalBeforeTax += amount;
      totalTax += tax;
    }
  });

  const totalPayment = totalBeforeTax + totalTax - totalDiscount;

  let html = `
    <div class="popup-overlay" onclick="closeInvoicePopup()"></div>
    <div class="popup invoice-popup">
      <div class="popup-header">
        <strong>🧾 Hóa đơn ${invoice.invoiceInfo?.number || ''}</strong>
        <button onclick="closeInvoicePopup()">✖️</button>
      </div>

      <div class="popup-body split-view">
        <div class="left-pane">
          <iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>
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
        <td>${p.name}</td>
        <td>${p.unit}</td>
        <td>${p.quantity}</td>
        <td>${formatCurrencyVN(p.price)}</td>
        <td>${formatCurrencyVN(p.discount || 0)}</td>
        <td>${p.taxRate || 0}%</td>
        <td>${formatCurrencyVN(p.amount)}</td>
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

  const wrapper = document.createElement('div');
  wrapper.id = 'invoicePopupWrapper';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  window.currentInvoiceIndex = index;
  window.currentInvoiceTaxCode = taxCode;
}

function closeInvoicePopup() {
  const el = document.getElementById('invoicePopupWrapper');
  if (el) el.remove();
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

function deleteInvoice(taxCode, index) {
  if (!confirm('❌ Bạn chắc chắn muốn xóa hóa đơn này?')) return;
  hkdData[taxCode].invoices.splice(index, 1);
  saveDataToLocalStorage();
  renderInvoiceTab(taxCode);
  toast('🗑️ Đã xóa hóa đơn');
}
