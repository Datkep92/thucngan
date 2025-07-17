function switchTonKhoTab(tab) {
  const tabs = ['main', 'km', 'ck'];
  tabs.forEach(t => {
    const div = document.getElementById(`tonKho-${t}`);
    if (div) div.style.display = (t === tab ? 'block' : 'none');
  });

  renderTonKhoTab(currentTaxCode, tab);
  updateMainTotalDisplay(currentTaxCode); // ✅ dùng biến toàn cục đã có
  //renderHKDTab(taxCode); // ✅ gọi lại toàn bộ tab

}


// Render tab tồn kho (phiên bản tối ưu)
function renderTonKhoTab(taxCode, type) {
  const map = { main: 'tonkhoMain', km: 'tonkhoKM', ck: 'tonkhoCK' };
  const divMap = { main: 'tonKho-main', km: 'tonKho-km', ck: 'tonKho-ck' };
  const spanMap = { main: 'total-tonkho-main', km: 'total-tonkho-km', ck: 'total-tonkho-ck' };

  // Lọc và tính toán dữ liệu
  let arr = (hkdData[taxCode][map[type]] || []).filter(item => {
    if (type === 'main') return item.category === 'hang_hoa';
    if (type === 'km') return item.category === 'KM';
    if (type === 'ck') return item.category === 'chiet_khau';
    return true;
  });

const total = arr.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Render bảng
  let html = `
<!-- ✅ Chuyển phần tổng xuống đây -->
<div style="margin-top:20px; font-weight:bold; display: flex; gap: 40px;">
  <div>💰 Tổng hàng hóa: <span id="total-tonkho-main">0 đ</span></div>
  <div>🎁 Tổng KM: <span id="total-tonkho-km">0 đ</span></div>
  <div>🔻 Tổng CK: <span id="total-tonkho-ck">0 đ</span></div>
</div>


      </div>
    <table border="1" cellpadding="6" cellspacing="0" style="margin-top:10px; width:100%; background:#fff;">
      <thead><tr>
        <th>STT</th><th>Tên</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>Thuế</th><th>Thao tác</th>
      </tr></thead><tbody>`;

  arr.forEach((item, i) => {
    const isEditing = (tonkhoEditing.index === i && tonkhoEditing.type === type && tonkhoEditing.taxCode === taxCode);
    const quantity = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const amount = quantity * price;

    html += `<tr><td>${i + 1}</td>`;
    if (isEditing) {
      html += `
        <td><input value="${item.name}" id="edit-name-${i}" style="width:100%"></td>
        <td><input value="${item.unit}" id="edit-unit-${i}" style="width:100%"></td>
        <td><input type="number" value="${item.quantity}" id="edit-qty-${i}" style="width:60px"></td>
        <td><input type="number" value="${item.price}" id="edit-price-${i}" style="width:80px"></td>
        <td>${amount.toLocaleString()}</td>
        <td><input value="${item.taxRate}" id="edit-tax-${i}" style="width:60px"></td>
        <td>
          <button onclick="confirmEditProduct('${taxCode}', '${type}', ${i})">💾</button>
          <button onclick="cancelEditProduct()">⛔</button>
        </td>`;
    } else {
      html += `
        <td>${item.name}</td>
        <td>${item.unit}</td>
        <td>${item.quantity}</td>
        <td>${item.price}</td>
<td>${(parseFloat(item.amount) || 0).toLocaleString()}</td>
        <td>${item.taxRate}</td>
        <td>
    <button onclick="createTonKhoItem('${taxCode}', '${type}')">➕</button>
          <button onclick="startEditProduct('${taxCode}', '${type}', ${i})">✏️</button>
          <button onclick="deleteTonKhoItem('${taxCode}', '${type}', ${i})">❌</button>
          <button onclick="moveTonKhoItemPrompt('${taxCode}', '${type}', ${i})">🔁</button>
        </td>`;
    }
    html += `</tr>`;
  });

  // Cập nhật giao diện
  // Cập nhật giao diện
document.getElementById(divMap[type]).innerHTML = html;

const totalSpan = document.getElementById(spanMap[type]);
if (totalSpan) {
  totalSpan.innerText = total.toLocaleString() + ' đ';
}

  
  // Cập nhật tổng chính nếu là tab hàng hóa hoặc chiết khấu
  if (type === 'main' || type === 'ck') updateMainTotalDisplay(taxCode);

  // Ẩn/hiện tab
  Object.keys(divMap).forEach(k => {
    const el = document.getElementById(divMap[k]);
    if (el) el.style.display = (k === type ? 'block' : 'none');
  });
}

// Hàm mới để xử lý prompt di chuyển
function moveTonKhoItemPrompt(taxCode, fromType, index) {
  const toType = prompt('Chuyển sang kho nào? (main/km/ck)', 'km')?.toLowerCase();
  if (['main', 'km', 'ck'].includes(toType)) {
    moveTonKhoItem(taxCode, fromType, index, toType);
  } else {
    alert('Loại kho không hợp lệ!');
  }
}

// Cập nhật tổng tiền thực tế (phiên bản chính xác)
function updateMainTotalDisplay(taxCode) {
  if (!hkdData[taxCode]) return;
  
  const tongHang = (hkdData[taxCode].tonkhoMain || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const tongCK = (hkdData[taxCode].tonkhoCK || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  
  const tongThucTe = tongHang + tongCK;

  const totalSpan = document.getElementById("total-tonkho-main");
  if (totalSpan) {
    totalSpan.innerText = tongThucTe.toLocaleString() + ' đ';
  }
}

// Bắt đầu chỉnh sửa sản phẩm
function startEditProduct(taxCode, type, index) {
  tonkhoEditing = { taxCode, type, index };
  renderTonKhoTab(taxCode, type);
}

// Hủy chỉnh sửa
function cancelEditProduct() {
  tonkhoEditing = { taxCode: '', type: '', index: -1 };
  renderTonKhoTab(currentTaxCode, tonkhoEditing.type || 'main');
}

// Xác nhận chỉnh sửa
function confirmEditProduct(taxCode, type, index) {
  const key = type === 'main' ? 'tonkhoMain' : (type === 'km' ? 'tonkhoKM' : 'tonkhoCK');
  const item = hkdData[taxCode][key][index];

  item.name = document.getElementById(`edit-name-${index}`).value.trim();
  item.unit = document.getElementById(`edit-unit-${index}`).value.trim();
  const qty = parseFloat(document.getElementById(`edit-qty-${index}`).value || '0');
  const price = parseFloat(document.getElementById(`edit-price-${index}`).value || '0');
  item.quantity = qty.toString();
  item.price = price.toString();
  item.amount = parseFloat((qty * price).toFixed(2)); // ✅ làm tròn tiền
  item.taxRate = document.getElementById(`edit-tax-${index}`).value.trim();

  tonkhoEditing = { taxCode: '', type: '', index: -1 };
  updateMainTotalDisplay(taxCode); // ✅ Thêm dòng này
  renderTonKhoTab(taxCode, type);
  saveDataToLocalStorage(); // ✅ lưu thay đổi
  renderHKDTab(taxCode); // ✅ gọi lại toàn bộ tab

}

// Tạo mới item tồn kho
function createTonKhoItem(taxCode, type) {
  const name = prompt("Tên sản phẩm:");
  if (!name) return;

  const unit = prompt("Đơn vị tính:", "cái") || "";
  const quantity = parseFloat(prompt("Số lượng:", "1") || "0");
  const price = parseFloat(prompt("Đơn giá:", "0") || "0");
  const taxRate = prompt("Thuế suất (%):", "0") || "0";

  const item = {
    name, unit,
    quantity: quantity.toString(),
    price: price.toString(),
    amount: parseFloat((quantity * price).toFixed(2)),
    taxRate,
    category: type === 'main' ? 'hang_hoa' : (type === 'km' ? 'KM' : 'chiet_khau')
  };

  const key = type === 'main' ? 'tonkhoMain' : (type === 'km' ? 'tonkhoKM' : 'tonkhoCK');
  hkdData[taxCode][key].push(item);
  updateMainTotalDisplay(taxCode); // ✅ Thêm dòng này
  renderTonKhoTab(taxCode, type);
  saveDataToLocalStorage(); // ✅
  renderHKDTab(taxCode); // ✅ gọi lại toàn bộ tab


}

// Xóa item tồn kho
function deleteTonKhoItem(taxCode, type, index) {
  const key = type === 'main' ? 'tonkhoMain' : (type === 'km' ? 'tonkhoKM' : 'tonkhoCK');
  if (!confirm("Bạn có chắc chắn muốn xóa dòng này?")) return;
  hkdData[taxCode][key].splice(index, 1);
updateMainTotalDisplay(taxCode);
  renderTonKhoTab(taxCode, type);
    renderHKDTab(taxCode); // ✅ gọi lại toàn bộ tab

  saveDataToLocalStorage(); // ✅
  updateMainTotalDisplay(taxCode); // ✅ Thêm dòng này

}

// Di chuyển item giữa các kho
function moveTonKhoItem(taxCode, fromType, index, toType) {
  if (fromType === toType) return alert("Kho đích trùng kho hiện tại.");
  const map = { main: 'tonkhoMain', km: 'tonkhoKM', ck: 'tonkhoCK' };
  const fromKey = map[fromType], toKey = map[toType];

  const item = hkdData[taxCode][fromKey].splice(index, 1)[0];
  item.category = toType === 'main' ? 'hang_hoa' : (toType === 'km' ? 'KM' : 'chiet_khau');
  hkdData[taxCode][toKey].push(item);
  renderTonKhoTab(taxCode, 'km');
  renderTonKhoTab(taxCode, 'main');
  renderTonKhoTab(taxCode, 'ck');
  saveDataToLocalStorage(); // ✅
  updateMainTotalDisplay(taxCode); // ✅ Thêm dòng này
  renderHKDTab(taxCode); // ✅ gọi lại toàn bộ tab


}
function exportAllInventoryToExcel(taxCode) {
  const hkd = hkdData[taxCode];
  if (!hkd) return;

  const all = [
    ...hkd.tonkhoMain.map(i => ({ ...i, loai: 'Hàng hóa' })),
    ...hkd.tonkhoKM.map(i => ({ ...i, loai: 'Khuyến mại' })),
    ...hkd.tonkhoCK.map(i => ({ ...i, loai: 'Chiết khấu' })),
  ];

  const rows = [
    ['Loại', 'Tên hàng hóa', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Thuế suất']
  ];

  all.forEach(item => {
    rows.push([
      item.loai,
      item.name,
      item.unit,
      item.quantity,
      item.price,
      item.amount,
      item.taxRate
    ]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `toan_bo_ton_kho_${taxCode}.csv`;
  a.click();
}
