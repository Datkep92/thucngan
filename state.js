// ==========================
// state.js - Quản lý trạng thái ứng dụng
// ==========================

// Biến toàn cục lưu trạng thái ứng dụng
let hkdData = {};
let hkdOrder = [];
let currentTaxCode = null;
let tonkhoEditing = { taxCode: '', type: '', index: -1 };
let exportInventoryData = [];
let logHistory = [];
let undoStack = [];

// Lưu vào localStorage
function saveDataToLocalStorage() {
  try {
    localStorage.setItem('hkdData', JSON.stringify(hkdData));
    localStorage.setItem('hkdOrder', JSON.stringify(hkdOrder));
    localStorage.setItem('logHistory', JSON.stringify(logHistory));
  } catch (e) {
    console.error('❌ Không thể lưu localStorage:', e);
    toast('❌ Lỗi khi lưu dữ liệu', 'error');
  }
}
function formatCurrencyVN(value, round = false) {
  if (typeof value !== 'number') value = parseFloat(value) || 0;
  if (round) value = Math.round(value / 1000) * 1000; // Làm tròn đến hàng nghìn
  return value.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Load từ localStorage
function loadDataFromLocalStorage() {
  try {
    const savedData = localStorage.getItem('hkdData');
    const savedOrder = localStorage.getItem('hkdOrder');
    const savedLogs = localStorage.getItem('logHistory');

    if (savedData && savedOrder) {
      hkdData = JSON.parse(savedData);
      hkdOrder = JSON.parse(savedOrder);
      logHistory = savedLogs ? JSON.parse(savedLogs) : [];
    }
  } catch (e) {
    console.error("❌ Lỗi đọc LocalStorage:", e);
    toast("❌ Không thể đọc dữ liệu trước đó", 'error');
  }
}
function formatCurrency(value) {
  return (value || 0).toLocaleString('vi-VN') + ' đ';
}

// Ghi log hành động
function logAction(action, dataSnapshot = null) {
  const entry = {
    time: new Date().toLocaleString(),
    action,
    data: dataSnapshot ? JSON.parse(JSON.stringify(dataSnapshot)) : null
  };
  
  logHistory.push(entry);
  if (logHistory.length > 100) logHistory.shift();
  
  if (dataSnapshot) {
    undoStack.push(JSON.stringify(dataSnapshot));
    if (undoStack.length > 20) undoStack.shift();
  }
}

// Hoàn tác hành động
function undoAction() {
  if (undoStack.length === 0) {
    toast("Không còn thao tác để hoàn tác", 'error');
    return false;
  }
  
  try {
    const previousState = JSON.parse(undoStack.pop());
    setState({
      hkdData: previousState.hkdData || {},
      hkdOrder: previousState.hkdOrder || [],
      currentTaxCode: previousState.currentTaxCode || null
    });
    renderHKDList();
    if (currentTaxCode) renderHKDTab(currentTaxCode);
    toast("✅ Đã hoàn tác", 'success');
    saveDataToLocalStorage();
    return true;
  } catch (error) {
    toast("❌ Lỗi khi hoàn tác: " + error.message, 'error');
    return false;
  }
}

// Lấy trạng thái hiện tại (dùng để log hoặc undo)
function getState() {
  return {
    hkdData: JSON.parse(JSON.stringify(hkdData)),
    hkdOrder: [...hkdOrder],
    currentTaxCode,
    tonkhoEditing: { ...tonkhoEditing },
    exportInventoryData: [...exportInventoryData],
    logHistory: [...logHistory],
    undoStack: [...undoStack]
  };
}

// Đặt lại trạng thái
function setState(newState) {
  if (newState.hkdData) hkdData = JSON.parse(JSON.stringify(newState.hkdData));
  if (newState.hkdOrder) hkdOrder = [...newState.hkdOrder];
  if (newState.currentTaxCode !== undefined) currentTaxCode = newState.currentTaxCode;
  if (newState.tonkhoEditing) tonkhoEditing = { ...newState.tonkhoEditing };
  if (newState.exportInventoryData) exportInventoryData = [...newState.exportInventoryData];
  if (newState.logHistory) logHistory = [...newState.logHistory];
  if (newState.undoStack) undoStack = [...newState.undoStack];
}

function showToast(message, duration = 3000, type = 'info') {
  Toastify({
    text: message,
    duration,
    gravity: 'top',
    position: 'right',
    style: {
      background: type === 'error' ? 'red' : type === 'success' ? 'green' : '#333',
    },
  }).showToast();
}

window.toast = showToast;


function showLogHistory() {
  if (!logHistory || logHistory.length === 0) {
    toast("📭 Không có lịch sử thao tác", 'info');
    return;
  }

  const lastLogs = logHistory.slice(-10).map(
    (log, i) => `${i + 1}. [${log.time}] ${log.action}`
  ).join("\n");

  alert("📝 Lịch sử gần đây:\n\n" + lastLogs);
}



function clearAll() {
  if (!confirm("Bạn có chắc chắn muốn xoá toàn bộ dữ liệu?")) return;

  hkdData = {};
  hkdOrder = [];
  currentTaxCode = null;
  undoStack = [];
  logHistory = [];

  localStorage.removeItem('hkdData');
  localStorage.removeItem('hkdOrder');
  localStorage.removeItem('logHistory');

  document.getElementById("businessList").innerHTML = "";
  document.getElementById("mainContent").innerHTML = '<div id="hkdInfo">Chưa chọn HKD</div>';
  toast("🗑️ Đã xoá toàn bộ dữ liệu", 'success');
}

// Gắn vào window để dùng toàn cục nếu cần
window.saveDataToLocalStorage = saveDataToLocalStorage;
window.loadDataFromLocalStorage = loadDataFromLocalStorage;
window.getState = getState;
window.setState = setState;
window.logAction = logAction;
window.undoAction = undoAction;
