// Main Application Logic for Shree Sawariya Traders Billing Web App
// Version 2.0 with Full Mobile Support, Customer Transport, State-based Automatic GST,
// Empty Rate on Selection, and Optional HSN.

let directoryHandle = null;
let customers = [];
let stockList = [];
let shopInfo = {};
let billItems = [];

// ====================================================================
// INDIAN STATES & UNION TERRITORIES (Official GST State Codes)
// ====================================================================
const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' }
];

// ====================================================================
// AUTOMATIC GST RULES CONFIGURATION
// Easily modify tax rates or state rules in this clearly named config
// Rule: Rajasthan -> IGST 5%. Any other state / unset -> CGST 2.5% + SGST 2.5%
// ====================================================================
const GST_TAX_CONFIG = {
  // Special interstate rule
  specialStateName: 'Rajasthan',
  specialStateIgstRate: 5.0,

  // Standard/default rule for all other states (Gujarat, Maharashtra, etc.)
  // and fallback when state is missing on old customers
  defaultCgstRate: 2.5,
  defaultSgstRate: 2.5
};

/**
 * Clearly named function to calculate GST rates based on Customer State
 * @param {string} stateName - Name of the customer state
 * @returns {object} { cgst, sgst, igst, badgeText, isMissingState }
 */
function calculateCustomerGstRates(stateName) {
  const cleanState = (stateName || '').trim().toLowerCase();
  
  if (cleanState === GST_TAX_CONFIG.specialStateName.toLowerCase()) {
    return {
      cgst: 0,
      sgst: 0,
      igst: GST_TAX_CONFIG.specialStateIgstRate,
      badgeText: '📍 ग्राहक राज्य: राजस्थान (Rajasthan) ➔ IGST 5% लागू',
      isMissingState: false
    };
  }

  if (!cleanState) {
    return {
      cgst: GST_TAX_CONFIG.defaultCgstRate,
      sgst: GST_TAX_CONFIG.defaultSgstRate,
      igst: 0,
      badgeText: '⚠️ ग्राहक राज्य सेट नहीं ➔ डिफ़ॉल्ट CGST 2.5% + SGST 2.5% लागू',
      isMissingState: true
    };
  }

  // Any other state (Gujarat, etc.)
  return {
    cgst: GST_TAX_CONFIG.defaultCgstRate,
    sgst: GST_TAX_CONFIG.defaultSgstRate,
    igst: 0,
    badgeText: `📍 ग्राहक राज्य: ${stateName} ➔ CGST 2.5% + SGST 2.5% लागू`,
    isMissingState: false
  };
}

// Helper: Toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Helper: Format Date for Display (DD/MM/YYYY)
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Helper: Format Rs and PS (e.g. 1250.75 -> { rs: "1250", ps: "75" })
function splitRsPs(num) {
  if (num === null || num === undefined || isNaN(num) || num === '') {
    return { rs: '', ps: '' };
  }
  const val = Number(num);
  if (val === 0) return { rs: '0', ps: '00' };
  const parts = val.toFixed(2).split('.');
  return {
    rs: parts[0],
    ps: parts[1]
  };
}

// Detect Mobile browser or touch screen
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ||
         (!('showDirectoryPicker' in window));
}

// ====================================================================
// INITIALIZATION
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Safe data migration on startup (ensures old stock rates are removed, transport/state fields exist)
  Storage.migrateData();

  // 2. Load stored data
  shopInfo = Storage.getShopInfo();
  customers = Storage.getCustomers();
  stockList = Storage.getStock();

  // 3. Populate Indian States dropdowns
  populateStateDropdowns();

  // 4. Try to restore saved Directory Handle from IndexedDB (for PC)
  try {
    directoryHandle = await getSavedDirectoryHandle();
    if (directoryHandle) {
      const folderName = Storage.getSavedFolderName() || directoryHandle.name;
      updateFolderStatusUI(folderName, true);
    } else {
      updateFolderStatusUI('', false);
    }
  } catch (err) {
    console.warn('Could not restore directory handle:', err);
    updateFolderStatusUI('', false);
  }

  // 5. Setup tabs
  setupTabs();

  // 6. Setup Modals
  setupModals();

  // 7. Render Header & Shop Info
  renderShopInfoUI();

  // 8. Populate Customer & Stock Management
  renderCustomerTable();
  renderStockTable();
  updateCustomerDataList();

  // 9. Initialize Billing Screen
  initBillingScreen();

  // 10. Backup & Restore listeners
  setupBackupRestore();

  // 11. Responsive Preview fit listener
  window.addEventListener('resize', fitBillPreviewToScreen);
  fitBillPreviewToScreen();
});

// Populate all state dropdowns (Customer Modal and Bill screen)
function populateStateDropdowns() {
  const custSelect = document.getElementById('custFormState');
  const billSelect = document.getElementById('billState');

  const optionsHtml = INDIAN_STATES.map(st => 
    `<option value="${st.name}" data-code="${st.code}">${st.name} (${st.code})</option>`
  ).join('');

  if (custSelect) {
    custSelect.innerHTML = `<option value="">-- राज्य चुनें (Select State) * --</option>` + optionsHtml;
  }
  if (billSelect) {
    billSelect.innerHTML = `<option value="">-- राज्य चुनें (Select State) --</option>` + optionsHtml;
    billSelect.value = 'Gujarat';
  }
}

// Update Folder Status Badge in UI
function updateFolderStatusUI(folderName, isConnected) {
  const statusEl = document.getElementById('folderStatusText');
  const btn = document.getElementById('btnChooseFolder');
  const isMobile = isMobileDevice();

  if (isMobile) {
    // On mobile, folder picker is not supported, inform user clearly
    if (statusEl) statusEl.innerText = `📱 मोबाइल मोड (Direct PDF/Share)`;
    if (btn) {
      btn.title = 'मोबाइल ब्राउज़र में बिल सीधे PDF डाउनलोड या Share होता है।';
      btn.classList.add('connected');
    }
    const btnSaveText = document.getElementById('btnSaveBillText');
    if (btnSaveText) btnSaveText.innerText = '💾 बिल सेव / शेयर करें (Save PDF)';
    return;
  }

  if (isConnected && folderName) {
    if (statusEl) statusEl.innerText = `📁 फोल्डर: ${folderName}`;
    if (btn) {
      btn.classList.add('connected');
      btn.title = `सेव फोल्डर: ${folderName} (बदलने के लिए क्लिक करें)`;
    }
  } else {
    if (statusEl) statusEl.innerText = `📁 सेव फोल्डर चुनें (Select Folder)`;
    if (btn) btn.classList.remove('connected');
  }
}

// Tab Switching
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');

      if (targetTab === 'tab-bill') {
        setTimeout(fitBillPreviewToScreen, 50);
      }
    });
  });
}

// Render Shop Info across App & Bill Preview
function renderShopInfoUI() {
  document.getElementById('headerShopTitle').innerText = shopInfo.shopName;
  document.getElementById('headerShopSubtitle').innerText = shopInfo.subtitle;

  // Bill Preview Header
  document.getElementById('prevShopGstin').innerText = shopInfo.gstin;
  document.getElementById('prevShopOwner').innerText = shopInfo.ownerName;
  document.getElementById('prevShopMobile').innerText = shopInfo.mobile;
  document.getElementById('prevShopName').innerText = shopInfo.shopName;
  document.getElementById('prevShopSubtitle').innerText = shopInfo.subtitle;
  document.getElementById('prevShopAddress').innerText = shopInfo.address;

  // Bank Info in Bill Preview
  document.getElementById('prevBankName').innerText = shopInfo.bankName;
  document.getElementById('prevBankBranch').innerText = shopInfo.bankBranch;
  document.getElementById('prevBankAc').innerText = shopInfo.accountNo;
  document.getElementById('prevBankIfsc').innerText = shopInfo.ifscCode;
  document.getElementById('prevForShopName').innerText = shopInfo.shopName;

  // Pre-fill Shop Settings Form
  document.getElementById('setShopName').value = shopInfo.shopName;
  document.getElementById('setSubtitle').value = shopInfo.subtitle;
  document.getElementById('setOwnerName').value = shopInfo.ownerName;
  document.getElementById('setMobile').value = shopInfo.mobile;
  document.getElementById('setGstin').value = shopInfo.gstin;
  document.getElementById('setAddress').value = shopInfo.address;
  document.getElementById('setBankName').value = shopInfo.bankName;
  document.getElementById('setBankBranch').value = shopInfo.bankBranch;
  document.getElementById('setAccountNo').value = shopInfo.accountNo;
  document.getElementById('setIfscCode').value = shopInfo.ifscCode;
}

// ====================================================================
// BILLING SCREEN LOGIC
// ====================================================================
function initBillingScreen() {
  // Set default today's date
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('billDate').value = today;

  // Set Bill Number from storage
  const lastBillNo = Storage.getLastBillNo();
  document.getElementById('billNumber').value = lastBillNo;

  // Default state Gujarat with code 24
  document.getElementById('billState').value = 'Gujarat';
  document.getElementById('billStateCode').value = '24';

  // Apply initial GST rule
  applyGstRuleForState('Gujarat');

  // Initial 3 blank item rows
  billItems = [
    { name: '', hsn: '', qty: '', rate: '', amount: 0 },
    { name: '', hsn: '', qty: '', rate: '', amount: 0 },
    { name: '', hsn: '', qty: '', rate: '', amount: 0 }
  ];
  renderBillInputRows();

  // Attach live event listeners to form inputs
  const liveInputs = [
    'billCustomerSelect', 'billCity', 'billCustomerGstin', 'billAddress',
    'billNumber', 'billDate', 'billLrNo', 'billTransport',
    'chargePacking', 'chargeMajuri', 'chargeDalali', 'chargePost',
    'taxSgstRate', 'taxCgstRate', 'taxIgstRate'
  ];

  liveInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateBillCalculationsAndPreview);
    }
  });

  // State dropdown on bill form
  document.getElementById('billState').addEventListener('change', handleBillStateChange);

  // Customer selection auto-fill
  document.getElementById('billCustomerSelect').addEventListener('input', handleCustomerSelectChange);

  // Add Row button
  document.getElementById('btnAddItemRow').addEventListener('click', () => {
    billItems.push({ name: '', hsn: '', qty: '', rate: '', amount: 0 });
    renderBillInputRows();
    updateBillCalculationsAndPreview();
  });

  // Action Buttons
  document.getElementById('btnResetBill').addEventListener('click', confirmResetBill);
  document.getElementById('btnPrintBill').addEventListener('click', printBill);
  document.getElementById('btnSaveBill').addEventListener('click', saveBillToFolder);
  document.getElementById('btnDownloadPdf').addEventListener('click', downloadBillPdf);
  document.getElementById('btnShareBill').addEventListener('click', shareBill);
  document.getElementById('btnDownloadHtml').addEventListener('click', downloadBillHtml);

  // Choose Folder Button (for PC)
  document.getElementById('btnChooseFolder').addEventListener('click', pickSaveFolder);

  // Initial Calculation & Preview render
  updateBillCalculationsAndPreview();
}

// When state is changed on the bill form directly
function handleBillStateChange(e) {
  const selectedStateName = e.target.value;
  const foundState = INDIAN_STATES.find(s => s.name === selectedStateName);
  const code = foundState ? foundState.code : '';
  document.getElementById('billStateCode').value = code;

  // Apply automatic GST rule for this state
  applyGstRuleForState(selectedStateName);
  updateBillCalculationsAndPreview();
}

// Apply GST rule according to Customer State
function applyGstRuleForState(stateName) {
  const rule = calculateCustomerGstRates(stateName);
  document.getElementById('taxCgstRate').value = rule.cgst;
  document.getElementById('taxSgstRate').value = rule.sgst;
  document.getElementById('taxIgstRate').value = rule.igst;

  const noticeEl = document.getElementById('gstRuleNotice');
  if (noticeEl) {
    noticeEl.innerText = rule.badgeText;
    if (rule.isMissingState) {
      noticeEl.className = 'gst-rule-badge warning';
    } else {
      noticeEl.className = 'gst-rule-badge';
    }
  }
}

// When user selects or types a customer name
function handleCustomerSelectChange(e) {
  const query = e.target.value.trim().toLowerCase();
  const alertEl = document.getElementById('customerStateAlert');

  if (!query) {
    if (alertEl) alertEl.style.display = 'none';
    return;
  }

  const found = customers.find(c => 
    c.name.toLowerCase() === query || 
    (c.phone && c.phone.includes(query))
  );

  if (found) {
    document.getElementById('billCity').value = found.city || '';
    document.getElementById('billCustomerGstin').value = found.gstin || '';
    document.getElementById('billAddress').value = found.address || '';

    // Auto-fill Transport (editable for this bill)
    document.getElementById('billTransport').value = found.transport || '';

    // Customer State & Code
    if (found.state) {
      document.getElementById('billState').value = found.state;
      const stObj = INDIAN_STATES.find(s => s.name.toLowerCase() === found.state.toLowerCase());
      document.getElementById('billStateCode').value = found.stateCode || (stObj ? stObj.code : '');
      if (alertEl) alertEl.style.display = 'none';
      applyGstRuleForState(found.state);
    } else {
      // Missing state highlight & fallback
      document.getElementById('billState').value = '';
      document.getElementById('billStateCode').value = '';
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.innerHTML = `⚠️ इस ग्राहक का राज्य (State) सेट नहीं है! कृपया राज्य चुनें (फिलहाल CGST 2.5% + SGST 2.5% लागू रहेगा)। <button type="button" class="btn btn-sm btn-secondary" onclick="openCustomerModal('${found.id}')">✏️ राज्य सेट करें</button>`;
      }
      applyGstRuleForState('');
    }
  } else {
    if (alertEl) alertEl.style.display = 'none';
  }

  updateBillCalculationsAndPreview();
}

// Render dynamic item rows in the Editor Panel (Responsive Table / Mobile Stacked Cards)
function renderBillInputRows() {
  const tbody = document.getElementById('billItemsTableBody');
  tbody.innerHTML = '';

  billItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'bill-item-row-entry';
    const stockDatalistId = `stockListRow_${index}`;

    tr.innerHTML = `
      <td class="col-sr-cell">
        <div class="card-header-mobile">
          <span class="card-index-badge">#${index + 1} आइटम</span>
          <button type="button" class="btn-icon-danger btn-remove-row" data-index="${index}" title="पंक्ति हटाएं">🗑️ हटाएँ</button>
        </div>
        <span class="desktop-only-sr">${index + 1}</span>
      </td>
      <td class="col-part-cell">
        <label class="mobile-only-label">आइटम विवरण (Particulars) *</label>
        <input type="text" class="form-control item-name-input" list="${stockDatalistId}" 
               data-index="${index}" value="${escapeHtml(item.name)}" placeholder="सामान चुनें या टाइप करें...">
        <datalist id="${stockDatalistId}">
          ${stockList.map(s => `<option value="${escapeHtml(s.name)}">${s.hsn ? 'HSN: ' + s.hsn + ' | ' : ''}${s.unit || 'Kg.'}</option>`).join('')}
        </datalist>
      </td>
      <td class="col-hsn-cell">
        <label class="mobile-only-label">HSN कोड (वैकल्पिक)</label>
        <input type="text" class="form-control item-hsn-input" data-index="${index}" value="${escapeHtml(item.hsn || '')}" placeholder="वैकल्पिक">
      </td>
      <td class="col-qty-cell">
        <label class="mobile-only-label">वजन / मात्रा (Kg) *</label>
        <input type="number" inputmode="decimal" class="form-control item-qty-input" data-index="${index}" value="${item.qty}" step="any" placeholder="0">
      </td>
      <td class="col-rate-cell">
        <label class="mobile-only-label">भाव (Rate ₹) *</label>
        <input type="number" inputmode="decimal" class="form-control item-rate-input" data-index="${index}" value="${item.rate}" step="any" placeholder="0.00">
      </td>
      <td class="col-amount-cell">
        <label class="mobile-only-label">रकम (Amount ₹)</label>
        <div class="item-amount-display-box">
          <span class="item-amount-display">₹${item.amount ? Number(item.amount).toFixed(2) : '0.00'}</span>
        </div>
      </td>
      <td class="col-del-cell desktop-only-del">
        <button type="button" class="btn-icon-danger btn-remove-row" data-index="${index}" title="पंक्ति हटाएं">✕</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach row event listeners
  tbody.querySelectorAll('.item-name-input').forEach(input => {
    input.addEventListener('input', handleItemNameChange);
  });

  tbody.querySelectorAll('.item-hsn-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-index');
      billItems[idx].hsn = e.target.value.trim();
      updateBillCalculationsAndPreview();
    });
  });

  tbody.querySelectorAll('.item-qty-input').forEach(input => {
    input.addEventListener('input', handleItemQtyOrRateChange);
  });

  tbody.querySelectorAll('.item-rate-input').forEach(input => {
    input.addEventListener('input', handleItemQtyOrRateChange);
  });

  tbody.querySelectorAll('.btn-remove-row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      if (billItems.length > 1) {
        billItems.splice(idx, 1);
      } else {
        billItems[0] = { name: '', hsn: '', qty: '', rate: '', amount: 0 };
      }
      renderBillInputRows();
      updateBillCalculationsAndPreview();
    });
  });
}

function handleItemNameChange(e) {
  const idx = parseInt(e.target.getAttribute('data-index'), 10);
  const val = e.target.value.trim();
  billItems[idx].name = e.target.value;

  // Check if val matches an item in stockList
  const matched = stockList.find(s => s.name.toLowerCase() === val.toLowerCase());
  const row = e.target.closest('tr');

  if (matched) {
    // Fill optional HSN if present, or leave empty
    billItems[idx].hsn = matched.hsn || '';

    // USER REQUIREMENT 5: Rate box must be EMPTY and typed per bill
    billItems[idx].rate = '';
    billItems[idx].amount = 0;

    if (row) {
      const hsnInput = row.querySelector('.item-hsn-input');
      if (hsnInput) hsnInput.value = matched.hsn || '';

      const rateInput = row.querySelector('.item-rate-input');
      if (rateInput) {
        rateInput.value = '';
        // Focus rate input for fast entry
        rateInput.focus();
      }

      const amountSpan = row.querySelector('.item-amount-display');
      if (amountSpan) amountSpan.innerText = '₹0.00';
    }
  }

  updateBillCalculationsAndPreview();
}

function handleItemQtyOrRateChange(e) {
  const idx = parseInt(e.target.getAttribute('data-index'), 10);
  const row = e.target.closest('tr');
  const qtyVal = row.querySelector('.item-qty-input').value;
  const rateVal = row.querySelector('.item-rate-input').value;

  billItems[idx].qty = qtyVal;
  billItems[idx].rate = rateVal;

  const qty = parseFloat(qtyVal) || 0;
  const rate = parseFloat(rateVal) || 0;
  billItems[idx].amount = qty * rate;

  const amountSpan = row.querySelector('.item-amount-display');
  if (amountSpan) {
    amountSpan.innerText = `₹${billItems[idx].amount.toFixed(2)}`;
  }

  updateBillCalculationsAndPreview();
}

// Validation before any bill action (Save, Print, Download, Share)
function validateBillBeforeAction() {
  const billNo = document.getElementById('billNumber').value.trim();
  if (!billNo) {
    showToast('कृपया बिल नंबर दर्ज करें। (Bill number is required)', 'error');
    document.getElementById('billNumber').focus();
    return false;
  }

  const custName = document.getElementById('billCustomerSelect').value.trim();
  if (!custName) {
    showToast('कृपया ग्राहक का नाम चुनें या लिखें। (Customer name is required)', 'error');
    document.getElementById('billCustomerSelect').focus();
    return false;
  }

  // Find active items with name or qty
  const activeItems = [];
  for (let i = 0; i < billItems.length; i++) {
    const item = billItems[i];
    if ((item.name && item.name.trim()) || (item.qty && parseFloat(item.qty) > 0)) {
      activeItems.push({ item, index: i });
    }
  }

  if (activeItems.length === 0) {
    showToast('बिल में कम से कम एक सामान जोड़ें। (Please add at least one item)', 'error');
    return false;
  }

  // USER REQUIREMENT 5: Do not allow saving a bill with an empty rate
  for (const entry of activeItems) {
    const item = entry.item;
    const idx = entry.index;

    if (!item.name || !item.name.trim()) {
      showToast(`पंक्ति #${idx + 1} का सामान नाम दर्ज करें।`, 'error');
      const nameInputs = document.querySelectorAll('.item-name-input');
      if (nameInputs[idx]) nameInputs[idx].focus();
      return false;
    }

    if (!item.qty || parseFloat(item.qty) <= 0) {
      showToast(`सामान "${item.name}" का वजन / मात्रा (Qty) भरें।`, 'error');
      const qtyInputs = document.querySelectorAll('.item-qty-input');
      if (qtyInputs[idx]) qtyInputs[idx].focus();
      return false;
    }

    if (item.rate === '' || item.rate === null || item.rate === undefined || isNaN(parseFloat(item.rate)) || parseFloat(item.rate) <= 0) {
      showToast(`सामान "${item.name}" का भाव (Rate) खाली है! कृपया भाव दर्ज करें।`, 'error');
      const rateInputs = document.querySelectorAll('.item-rate-input');
      if (rateInputs[idx]) rateInputs[idx].focus();
      return false;
    }
  }

  return true;
}

// Master function: Recompute totals and render exact Bill Preview
function updateBillCalculationsAndPreview() {
  const billNo = document.getElementById('billNumber').value || '';
  const dateVal = document.getElementById('billDate').value || '';
  const customerName = document.getElementById('billCustomerSelect').value || '';
  const city = document.getElementById('billCity').value || '';
  const address = document.getElementById('billAddress').value || '';
  const state = document.getElementById('billState').value || '';
  const stateCode = document.getElementById('billStateCode').value || '';
  const gstin = document.getElementById('billCustomerGstin').value || '';
  const lrNo = document.getElementById('billLrNo').value || '';
  const transport = document.getElementById('billTransport').value || '';

  // Update Preview Meta
  document.getElementById('prevBillNo').innerText = billNo;
  document.getElementById('prevBillDate').innerText = formatDateDisplay(dateVal);
  document.getElementById('prevCustomerName').innerText = customerName;
  document.getElementById('prevCustomerCity').innerText = city;
  document.getElementById('prevCustomerAddress').innerText = address;
  document.getElementById('prevCustomerState').innerText = state;
  document.getElementById('prevCustomerStateCode').innerText = stateCode;
  document.getElementById('prevCustomerGstin').innerText = gstin;
  document.getElementById('prevLrNo').innerText = lrNo;
  document.getElementById('prevTransport').innerText = transport;

  // Additional Charges
  const packing = parseFloat(document.getElementById('chargePacking').value) || 0;
  const majuri = parseFloat(document.getElementById('chargeMajuri').value) || 0;
  const dalali = parseFloat(document.getElementById('chargeDalali').value) || 0;
  const post = parseFloat(document.getElementById('chargePost').value) || 0;
  const totalCharges = packing + majuri + dalali + post;

  // Render Charges Sub-row in Preview
  document.getElementById('prevChargePacking').innerText = packing > 0 ? packing.toFixed(2) : '';
  document.getElementById('prevChargeMajuri').innerText = majuri > 0 ? majuri.toFixed(2) : '';
  document.getElementById('prevChargeDalali').innerText = dalali > 0 ? dalali.toFixed(2) : '';
  document.getElementById('prevChargePost').innerText = post > 0 ? post.toFixed(2) : '';

  const chargesSplit = splitRsPs(totalCharges);
  document.getElementById('prevChargesRs').innerText = totalCharges > 0 ? chargesSplit.rs : '';
  document.getElementById('prevChargesPs').innerText = totalCharges > 0 ? chargesSplit.ps : '';

  // Items Subtotal
  let itemsSubtotal = 0;
  billItems.forEach(item => {
    itemsSubtotal += (item.amount || 0);
  });

  const totalBeforeTax = itemsSubtotal + totalCharges;
  const totalSplit = splitRsPs(totalBeforeTax);
  document.getElementById('prevTotalRs').innerText = totalSplit.rs;
  document.getElementById('prevTotalPs').innerText = totalSplit.ps;

  // GST Calculations
  const sgstRate = parseFloat(document.getElementById('taxSgstRate').value) || 0;
  const cgstRate = parseFloat(document.getElementById('taxCgstRate').value) || 0;
  const igstRate = parseFloat(document.getElementById('taxIgstRate').value) || 0;

  const sgstAmt = totalBeforeTax * (sgstRate / 100);
  const cgstAmt = totalBeforeTax * (cgstRate / 100);
  const igstAmt = totalBeforeTax * (igstRate / 100);

  // Update SGST/CGST/IGST labels and amounts
  document.getElementById('prevSgstPctLabel').innerText = sgstRate > 0 ? `${sgstRate}%` : '%';
  document.getElementById('prevCgstPctLabel').innerText = cgstRate > 0 ? `${cgstRate}%` : '%';
  document.getElementById('prevIgstPctLabel').innerText = igstRate > 0 ? `${igstRate}%` : '%';

  const sgstSplit = splitRsPs(sgstAmt);
  const cgstSplit = splitRsPs(cgstAmt);
  const igstSplit = splitRsPs(igstAmt);

  document.getElementById('prevSgstRs').innerText = sgstAmt > 0 ? sgstSplit.rs : '';
  document.getElementById('prevSgstPs').innerText = sgstAmt > 0 ? sgstSplit.ps : '';

  document.getElementById('prevCgstRs').innerText = cgstAmt > 0 ? cgstSplit.rs : '';
  document.getElementById('prevCgstPs').innerText = cgstAmt > 0 ? cgstSplit.ps : '';

  document.getElementById('prevIgstRs').innerText = igstAmt > 0 ? igstSplit.rs : '';
  document.getElementById('prevIgstPs').innerText = igstAmt > 0 ? igstSplit.ps : '';

  // Total with Tax
  const rawGrandTotal = totalBeforeTax + sgstAmt + cgstAmt + igstAmt;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = roundedGrandTotal - rawGrandTotal;

  const roundOffSplit = splitRsPs(Math.abs(roundOff));
  const roundOffSign = roundOff < 0 ? '-' : (roundOff > 0 ? '+' : '');
  document.getElementById('prevRoundOffRs').innerText = roundOff !== 0 ? `${roundOffSign}${roundOffSplit.rs}` : '0';
  document.getElementById('prevRoundOffPs').innerText = roundOff !== 0 ? roundOffSplit.ps : '00';

  const grandTotalSplit = splitRsPs(roundedGrandTotal);
  document.getElementById('prevGrandTotalRs').innerText = grandTotalSplit.rs;
  document.getElementById('prevGrandTotalPs').innerText = grandTotalSplit.ps;

  // Rs In Words
  const words = numberToIndianWords(roundedGrandTotal);
  document.getElementById('prevRsInWords').innerText = words;

  // Render exactly 12 table rows in Preview to preserve fixed bill layout
  renderPreviewTableRows();

  // Scale preview cleanly to phone screen
  fitBillPreviewToScreen();
}

function renderPreviewTableRows() {
  const tbody = document.getElementById('prevItemsTableBody');
  tbody.innerHTML = '';

  const TOTAL_FIXED_ROWS = 12; // Matches exact physical bill book slot count

  for (let i = 0; i < TOTAL_FIXED_ROWS; i++) {
    const item = billItems[i];
    const tr = document.createElement('tr');
    tr.className = 'bill-item-row';

    if (item && (item.name || item.qty || item.rate)) {
      const amountSplit = splitRsPs(item.amount);
      // USER REQUIREMENT 4: Print HSN on bill only if filled in!
      const hsnText = item.hsn ? escapeHtml(item.hsn) : '';

      tr.innerHTML = `
        <td class="col-sr cell-sr">${i + 1}</td>
        <td class="col-part cell-part">${escapeHtml(item.name)}</td>
        <td class="col-hsn cell-hsn">${hsnText}</td>
        <td class="col-kg cell-kg">${item.qty ? Number(item.qty) : ''}</td>
        <td class="col-rate cell-rate">${item.rate ? Number(item.rate).toFixed(2) : ''}</td>
        <td class="col-rs cell-rs">${amountSplit.rs}</td>
        <td class="col-ps cell-ps">${amountSplit.ps}</td>
      `;
    } else {
      // Empty row to maintain fixed physical grid
      tr.innerHTML = `
        <td class="col-sr cell-sr"></td>
        <td class="col-part cell-part"></td>
        <td class="col-hsn cell-hsn"></td>
        <td class="col-kg cell-kg"></td>
        <td class="col-rate cell-rate"></td>
        <td class="col-rs cell-rs"></td>
        <td class="col-ps cell-ps"></td>
      `;
    }

    tbody.appendChild(tr);
  }
}

// Scale bill preview so it fits phone screen without sideways scroll
function fitBillPreviewToScreen() {
  const wrapper = document.getElementById('previewScrollWrapper');
  const container = document.getElementById('previewScaleContainer');
  const bill = document.getElementById('printable-bill');
  if (!wrapper || !container || !bill) return;

  const availableWidth = wrapper.clientWidth - 16;
  const billWidth = 720; // Exact A4 layout width

  if (availableWidth > 0 && availableWidth < billWidth) {
    const scale = Math.max(0.35, availableWidth / billWidth);
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top center';
    container.style.width = `${billWidth}px`;
    const unscaledHeight = bill.offsetHeight || 1020;
    container.style.height = `${unscaledHeight}px`;
    wrapper.style.height = `${Math.ceil(unscaledHeight * scale) + 24}px`;
    wrapper.style.overflow = 'hidden';
  } else {
    container.style.transform = 'none';
    container.style.width = 'auto';
    container.style.height = 'auto';
    wrapper.style.height = 'auto';
    wrapper.style.overflow = 'auto';
  }
}

// Reset bill form and ready for next bill
function confirmResetBill() {
  if (confirm('क्या आप नया बिल बनाना चाहते हैं? वर्तमान बिल साफ हो जाएगा। (Create new bill?)')) {
    clearBillForm();
    showToast('नया बिल तैयार है। (New bill ready)', 'info');
  }
}

function clearBillForm(keepNextNumber = true) {
  if (keepNextNumber) {
    const currNo = parseInt(document.getElementById('billNumber').value, 10) || Storage.getLastBillNo();
    document.getElementById('billNumber').value = currNo;
  }
  document.getElementById('billCustomerSelect').value = '';
  document.getElementById('billCity').value = '';
  document.getElementById('billAddress').value = '';
  document.getElementById('billState').value = 'Gujarat';
  document.getElementById('billStateCode').value = '24';
  document.getElementById('billCustomerGstin').value = '';
  document.getElementById('billLrNo').value = '';
  document.getElementById('billTransport').value = '';
  document.getElementById('chargePacking').value = '';
  document.getElementById('chargeMajuri').value = '';
  document.getElementById('chargeDalali').value = '';
  document.getElementById('chargePost').value = '';

  const alertEl = document.getElementById('customerStateAlert');
  if (alertEl) alertEl.style.display = 'none';

  applyGstRuleForState('Gujarat');

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('billDate').value = today;

  billItems = [
    { name: '', hsn: '', qty: '', rate: '', amount: 0 },
    { name: '', hsn: '', qty: '', rate: '', amount: 0 },
    { name: '', hsn: '', qty: '', rate: '', amount: 0 }
  ];
  renderBillInputRows();
  updateBillCalculationsAndPreview();
}

// Increment Bill Number and persist
function incrementBillNumber() {
  const currentNum = parseInt(document.getElementById('billNumber').value, 10) || Storage.getLastBillNo();
  const nextNum = currentNum + 1;
  Storage.saveLastBillNo(nextNum);
  document.getElementById('billNumber').value = nextNum;
}

// Print Bill
function printBill() {
  if (!validateBillBeforeAction()) return;
  window.print();
}

// ====================================================================
// SAVE TO LOCAL FOLDER / MOBILE SHARE & DIRECT PDF
// ====================================================================
async function pickSaveFolder() {
  if (!('showDirectoryPicker' in window)) {
    alert('आपके ब्राउज़र में डायरेक्टरी पिकर उपलब्ध नहीं है। बिल सीधे डाउनलोड या शेयर होगा। (Folder picker not supported on this browser).');
    return null;
  }

  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    directoryHandle = handle;
    await saveDirectoryHandle(handle);
    Storage.setSavedFolderName(handle.name);
    updateFolderStatusUI(handle.name, true);
    showToast(`सेव फोल्डर सेट हो गया: ${handle.name}`, 'success');
    return handle;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error(err);
      showToast('फोल्डर चुनने में त्रुटि हुई।', 'error');
    }
    return null;
  }
}

// Verify permission for stored directory handle
async function verifyPermission(fileHandle, readWrite) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

// Generate PDF Blob from Bill Element (ensures unscaled full A4 quality)
async function generateBillPdfBlob() {
  const element = document.getElementById('printable-bill');
  const container = document.getElementById('previewScaleContainer');
  
  // Temporarily reset preview scale for pristine full A4 rendering
  const prevTransform = container ? container.style.transform : '';
  if (container) container.style.transform = 'none';

  const opt = {
    margin: [4, 4, 4, 4],
    filename: 'bill.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const blob = await html2pdf().set(opt).from(element).outputPdf('blob');
    if (container) container.style.transform = prevTransform;
    return blob;
  } catch (e) {
    if (container) container.style.transform = prevTransform;
    throw e;
  }
}

// Get standard sanitized filename: Bill_{No}_{Customer}_{Date}.pdf
function getBillFileName(ext = 'pdf') {
  const billNo = document.getElementById('billNumber').value || 'Bill';
  let custName = document.getElementById('billCustomerSelect').value || 'Customer';
  custName = custName.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_').substring(0, 30);
  const dateVal = document.getElementById('billDate').value || new Date().toISOString().slice(0, 10);
  return `Bill_${billNo}_${custName}_${dateVal}.${ext}`;
}

// Save Bill to Folder (PC) or Share/Download (Mobile)
async function saveBillToFolder() {
  if (!validateBillBeforeAction()) return;

  showToast('पीडीएफ तैयार हो रहा है... (Generating PDF)', 'info');

  try {
    const pdfBlob = await generateBillPdfBlob();
    const fileName = getBillFileName('pdf');
    const isMobile = isMobileDevice();

    // ON MOBILE: Fall back to sharing / downloading
    if (isMobile || !('showDirectoryPicker' in window)) {
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // Use Web Share API if supported
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: fileName,
            text: `Shree Sawariya Traders - Bill #${document.getElementById('billNumber').value}`
          });
          showToast(`बिल शेयर हो गया: ${fileName}`, 'success');
          incrementBillNumber();
          clearBillForm(true);
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            showToast('शेयर संवाद बंद किया गया। (Share cancelled)', 'info');
            return;
          }
          console.warn('Share error, downloading directly:', shareErr);
        }
      }

      // Mobile download fallback
      downloadBlob(pdfBlob, fileName);
      showToast(`बिल पीडीएफ डाउनलोड हो गया: ${fileName}`, 'success');
      incrementBillNumber();
      clearBillForm(true);
      return;
    }

    // ON PC: Keep current save-to-folder behavior
    let savedDirectly = false;

    if (directoryHandle) {
      const hasPermission = await verifyPermission(directoryHandle, true);
      if (hasPermission) {
        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
        savedDirectly = true;
      }
    }

    if (!savedDirectly) {
      if ('showDirectoryPicker' in window && !directoryHandle) {
        const picked = await pickSaveFolder();
        if (picked) {
          const fileHandle = await picked.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
          savedDirectly = true;
        }
      }
    }

    if (savedDirectly) {
      showToast(`बिल आपके फोल्डर में सेव हो गया: ${fileName}`, 'success');
    } else {
      downloadBlob(pdfBlob, fileName);
      showToast(`बिल डाउनलोड हो गया: ${fileName}`, 'success');
    }

    incrementBillNumber();
    clearBillForm(true);

  } catch (err) {
    console.error('Error saving bill:', err);
    showToast('बिल सेव करने में त्रुटि: ' + err.message, 'error');
  }
}

// Share Bill via Web Share API (WhatsApp, Drive, Email, Files)
async function shareBill() {
  if (!validateBillBeforeAction()) return;

  showToast('पीडीएफ तैयार हो रहा है...', 'info');

  try {
    const pdfBlob = await generateBillPdfBlob();
    const fileName = getBillFileName('pdf');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: fileName,
        text: `Shree Sawariya Traders - Bill #${document.getElementById('billNumber').value}`
      });
      showToast(`बिल शेयर हो गया!`, 'success');
    } else {
      // Fallback: direct download
      downloadBlob(pdfBlob, fileName);
      showToast('शेयर उपलब्ध नहीं था, पीडीएफ डाउनलोड हो गया!', 'info');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error(err);
      showToast('शेयर करने में त्रुटि: ' + err.message, 'error');
    }
  }
}

// Direct PDF Download Button
async function downloadBillPdf() {
  if (!validateBillBeforeAction()) return;

  try {
    showToast('पीडीएफ तैयार हो रहा है...', 'info');
    const pdfBlob = await generateBillPdfBlob();
    const fileName = getBillFileName('pdf');
    downloadBlob(pdfBlob, fileName);
    showToast('पीडीएफ डाउनलोड हो गया!', 'success');
  } catch (err) {
    showToast('PDF बनाने में त्रुटि: ' + err.message, 'error');
  }
}

// Direct HTML File Download
function downloadBillHtml() {
  const billEl = document.getElementById('printable-bill');
  const fileName = getBillFileName('html');

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${fileName}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Times New Roman", Times, Georgia, serif; background: #fff; padding: 20px; display: flex; justify-content: center; }
.bill-paper { width: 720px; color: #a01a28; border: 2px solid #a01a28; padding: 16px 20px; }
.bill-header-top { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
.bill-header-center { text-align: center; }
.tax-invoice { font-size: 15px; font-weight: 800; letter-spacing: 1px; }
.shree-ganesh { font-size: 11px; font-weight: bold; }
.bill-shop-name { text-align: center; font-size: 38px; font-weight: 900; margin: 6px 0 4px; }
.bill-subtitle-banner { background: #a01a28; color: #fff; text-align: center; font-family: Arial; font-size: 11.5px; font-weight: 900; letter-spacing: 1.5px; padding: 2.5px 6px; margin: 2px auto 5px; width: fit-content; }
.bill-shop-address { text-align: center; font-family: Arial; font-size: 11px; font-weight: 600; margin-bottom: 8px; }
.bill-meta-box { border: 1.5px solid #a01a28; border-radius: 4px; padding: 6px 10px; font-size: 13px; margin-bottom: 8px; font-family: Arial; }
.meta-line { display: flex; align-items: baseline; margin-bottom: 4px; }
.meta-label { font-weight: bold; white-space: nowrap; }
.meta-value-line { border-bottom: 1px solid #a01a28; flex-grow: 1; padding: 0 6px; font-weight: bold; color: #111; min-height: 18px; }
.bill-items-table { width: 100%; border-collapse: collapse; border: 1.5px solid #a01a28; font-family: Arial; font-size: 12px; }
.bill-items-table th, .bill-items-table td { border-right: 1.5px solid #a01a28; padding: 3px 5px; }
.bill-items-table thead th { border-bottom: 1.5px solid #a01a28; font-weight: 800; text-align: center; }
.col-sr { width: 34px; text-align: center; }
.col-part { width: auto; text-align: left; }
.col-hsn { width: 68px; text-align: center; }
.col-kg { width: 55px; text-align: right; }
.col-rate { width: 65px; text-align: right; }
.col-rs { width: 72px; text-align: right; }
.col-ps { width: 33px; text-align: right; }
.bill-item-row { height: 23px; }
.bill-charges-row { border-top: 1.5px solid #a01a28; border-bottom: 1.5px solid #a01a28; height: 24px; display: flex; border-left: 1.5px solid #a01a28; border-right: 1.5px solid #a01a28; }
.charges-sub-cells { display: flex; flex: 1; }
.charge-cell { flex: 1; border-right: 1.5px solid #a01a28; display: flex; justify-content: space-between; align-items: center; padding: 0 4px; font-size: 11px; font-weight: bold; }
.bill-bottom-container { display: flex; border: 1.5px solid #a01a28; border-top: none; font-family: Arial; font-size: 12px; }
.bill-bank-section { flex: 1; border-right: 1.5px solid #a01a28; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; }
.bank-title { font-size: 14px; font-weight: 900; }
.bank-branch { font-size: 13px; font-weight: 800; }
.bank-detail-line { font-size: 13px; font-weight: 800; }
.bank-words-line { margin-top: 10px; font-size: 12px; font-weight: bold; border-top: 1px dotted #a01a28; padding-top: 4px; }
.bill-totals-section { width: 230px; }
.total-line { display: flex; border-bottom: 1px solid #a01a28; height: 22px; align-items: center; }
.total-line-grand { height: 26px; border-top: 1.5px solid #a01a28; }
.total-label { flex: 1; padding: 0 6px; font-weight: bold; border-right: 1.5px solid #a01a28; font-size: 11.5px; display: flex; justify-content: space-between; }
.total-val-rs { width: 72px; text-align: right; padding-right: 4px; font-weight: bold; border-right: 1.5px solid #a01a28; color: #111; }
.total-val-ps { width: 33px; text-align: right; padding-right: 4px; font-weight: bold; color: #111; }
.bill-footer-section { margin-top: 6px; display: flex; justify-content: space-between; align-items: flex-end; font-family: Arial; font-size: 10px; }
.terms-list { list-style: none; }
.terms-list li { padding-left: 10px; position: relative; font-size: 9.5px; font-weight: 600; }
.terms-list li::before { content: "•"; position: absolute; left: 0; }
.receiver-sign-line { margin-top: 14px; font-weight: bold; font-size: 11.5px; }
.eoe-tag { font-weight: bold; font-size: 11px; padding-bottom: 4px; }
.for-sign-box { text-align: right; font-size: 11.5px; font-weight: bold; }
.sign-gap { height: 38px; }
@media print { body { padding: 0; } }
</style>
</head>
<body>
${billEl.outerHTML}
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  downloadBlob(blob, fileName);
  showToast(`HTML बिल डाउनलोड हो गया: ${fileName}`, 'success');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====================================================================
// CUSTOMER MANAGEMENT
// ====================================================================
function renderCustomerTable(filter = '') {
  const tbody = document.getElementById('customerTableBody');
  tbody.innerHTML = '';

  const q = filter.toLowerCase().trim();
  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(q) || 
    (c.city && c.city.toLowerCase().includes(q)) || 
    (c.phone && c.phone.includes(q)) ||
    (c.gstin && c.gstin.toLowerCase().includes(q)) ||
    (c.transport && c.transport.toLowerCase().includes(q)) ||
    (c.state && c.state.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">कोई ग्राहक नहीं मिला। (No customers found)</td></tr>`;
    return;
  }

  filtered.forEach((c, idx) => {
    const tr = document.createElement('tr');
    const stateDisplay = c.state 
      ? `${escapeHtml(c.state)} (${escapeHtml(c.stateCode || '')})` 
      : `<span class="badge-missing-state">⚠️ राज्य चुनें</span>`;

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="font-weight: 700; color: #1e293b;">${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.phone || '-')}</td>
      <td>${escapeHtml(c.city || '-')}</td>
      <td>${stateDisplay}</td>
      <td>${escapeHtml(c.transport || '-')}</td>
      <td><code>${escapeHtml(c.gstin || '-')}</code></td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm btn-edit-customer" data-id="${c.id}">✏️ एडिट</button>
        <button class="btn btn-icon-danger btn-sm btn-del-customer" data-id="${c.id}" style="margin-left: 4px;">🗑️ हटाएं</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit-customer').forEach(b => {
    b.addEventListener('click', (e) => openCustomerModal(e.currentTarget.getAttribute('data-id')));
  });

  tbody.querySelectorAll('.btn-del-customer').forEach(b => {
    b.addEventListener('click', (e) => deleteCustomer(e.currentTarget.getAttribute('data-id')));
  });
}

function updateCustomerDataList() {
  const dl = document.getElementById('customerDataList');
  dl.innerHTML = '';
  customers.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.label = `${c.city ? c.city + ' | ' : ''}${c.transport ? c.transport + ' | ' : ''}${c.phone || ''}`;
    dl.appendChild(opt);
  });
}

function openCustomerModal(id = null) {
  const form = document.getElementById('customerForm');
  form.reset();
  document.getElementById('custFormId').value = '';

  const stateSelect = document.getElementById('custFormState');

  if (id) {
    const c = customers.find(x => x.id === id);
    if (c) {
      document.getElementById('customerModalTitle').innerText = 'ग्राहक विवरण बदलें (Edit Customer)';
      document.getElementById('custFormId').value = c.id;
      document.getElementById('custFormName').value = c.name;
      document.getElementById('custFormPhone').value = c.phone || '';
      document.getElementById('custFormCity').value = c.city || '';
      document.getElementById('custFormAddress').value = c.address || '';
      document.getElementById('custFormGstin').value = c.gstin || '';
      document.getElementById('custFormTransport').value = c.transport || '';

      if (stateSelect) {
        stateSelect.value = c.state || '';
      }
      document.getElementById('custFormStateCode').value = c.stateCode || '';
    }
  } else {
    document.getElementById('customerModalTitle').innerText = 'नया ग्राहक जोड़ें (Add Customer)';
    if (stateSelect) {
      stateSelect.value = 'Gujarat';
    }
    document.getElementById('custFormStateCode').value = '24';
  }

  openModal('customerModal');
}

function saveCustomer(e) {
  e.preventDefault();
  const id = document.getElementById('custFormId').value;
  const name = document.getElementById('custFormName').value.trim();
  const phone = document.getElementById('custFormPhone').value.trim();
  const city = document.getElementById('custFormCity').value.trim();
  const address = document.getElementById('custFormAddress').value.trim();
  const state = document.getElementById('custFormState').value.trim();
  const stateCode = document.getElementById('custFormStateCode').value.trim();
  const gstin = document.getElementById('custFormGstin').value.trim();
  const transport = document.getElementById('custFormTransport').value.trim();

  if (!name) {
    alert('कृपया ग्राहक का नाम दर्ज करें।');
    return;
  }
  if (!state) {
    alert('कृपया राज्य (State) का चयन करें। राज्य अनिवार्य है।');
    return;
  }

  if (id) {
    // Edit existing
    const idx = customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      customers[idx] = { id, name, phone, city, address, state, stateCode, gstin, transport };
      showToast('ग्राहक जानकारी अपडेट हो गई।', 'success');
    }
  } else {
    // Add new
    const newCust = {
      id: 'c_' + Date.now(),
      name, phone, city, address, state, stateCode, gstin, transport
    };
    customers.push(newCust);
    showToast('नया ग्राहक जुड़ गया।', 'success');

    // If added from bill screen, auto-select!
    const billCustInput = document.getElementById('billCustomerSelect');
    billCustInput.value = name;
    document.getElementById('billCity').value = city;
    document.getElementById('billAddress').value = address;
    document.getElementById('billState').value = state;
    document.getElementById('billStateCode').value = stateCode;
    document.getElementById('billCustomerGstin').value = gstin;
    document.getElementById('billTransport').value = transport;

    const alertEl = document.getElementById('customerStateAlert');
    if (alertEl) alertEl.style.display = 'none';

    applyGstRuleForState(state);
    updateBillCalculationsAndPreview();
  }

  Storage.saveCustomers(customers);
  renderCustomerTable();
  updateCustomerDataList();
  closeModal('customerModal');

  // If this customer was currently on the bill screen, update their info
  const currBillCust = document.getElementById('billCustomerSelect').value.trim().toLowerCase();
  if (currBillCust === name.toLowerCase()) {
    document.getElementById('billTransport').value = transport;
    document.getElementById('billState').value = state;
    document.getElementById('billStateCode').value = stateCode;
    const alertEl = document.getElementById('customerStateAlert');
    if (alertEl) alertEl.style.display = 'none';
    applyGstRuleForState(state);
    updateBillCalculationsAndPreview();
  }
}

function deleteCustomer(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;

  if (confirm(`क्या आप "${c.name}" को ग्राहक सूची से हटाना चाहते हैं?`)) {
    customers = customers.filter(x => x.id !== id);
    Storage.saveCustomers(customers);
    renderCustomerTable();
    updateCustomerDataList();
    showToast('ग्राहक हटा दिया गया।', 'info');
  }
}

// ====================================================================
// STOCK MANAGEMENT (Rate removed from Stock, rate is per-bill)
// ====================================================================
function renderStockTable(filter = '') {
  const tbody = document.getElementById('stockTableBody');
  tbody.innerHTML = '';

  const q = filter.toLowerCase().trim();
  const filtered = stockList.filter(s => 
    s.name.toLowerCase().includes(q) || 
    (s.hsn && s.hsn.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">कोई सामान नहीं मिला। (No stock items found)</td></tr>`;
    return;
  }

  filtered.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="font-weight: 700; color: #1e293b;">${escapeHtml(s.name)}</td>
      <td><code>${escapeHtml(s.hsn || '-')}</code></td>
      <td>${escapeHtml(s.unit || 'Kg.')}</td>
      <td>${s.qty !== undefined && s.qty !== null && s.qty !== '' ? s.qty + ' ' + (s.unit || 'Kg.') : '-'}</td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm btn-edit-stock" data-id="${s.id}">✏️ एडिट</button>
        <button class="btn btn-icon-danger btn-sm btn-del-stock" data-id="${s.id}" style="margin-left: 4px;">🗑️ हटाएं</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit-stock').forEach(b => {
    b.addEventListener('click', (e) => openStockModal(e.currentTarget.getAttribute('data-id')));
  });

  tbody.querySelectorAll('.btn-del-stock').forEach(b => {
    b.addEventListener('click', (e) => deleteStock(e.currentTarget.getAttribute('data-id')));
  });
}

function openStockModal(id = null) {
  const form = document.getElementById('stockForm');
  form.reset();
  document.getElementById('stockFormId').value = '';

  if (id) {
    const s = stockList.find(x => x.id === id);
    if (s) {
      document.getElementById('stockModalTitle').innerText = 'सामान विवरण बदलें (Edit Item)';
      document.getElementById('stockFormId').value = s.id;
      document.getElementById('stockFormName').value = s.name;
      // USER REQUIREMENT 4: HSN empty by default, optional
      document.getElementById('stockFormHsn').value = s.hsn || '';
      document.getElementById('stockFormUnit').value = s.unit || 'Kg.';
      document.getElementById('stockFormQty').value = s.qty || '';
    }
  } else {
    document.getElementById('stockModalTitle').innerText = 'नया सामान जोड़ें (Add Item)';
    document.getElementById('stockFormUnit').value = 'Kg.';
    document.getElementById('stockFormHsn').value = '';
    document.getElementById('stockFormQty').value = '';
  }

  openModal('stockModal');
}

function saveStock(e) {
  e.preventDefault();
  const id = document.getElementById('stockFormId').value;
  const name = document.getElementById('stockFormName').value.trim();
  const hsn = document.getElementById('stockFormHsn').value.trim();
  const unit = document.getElementById('stockFormUnit').value.trim() || 'Kg.';
  const qty = document.getElementById('stockFormQty').value;

  if (!name) {
    alert('कृपया सामान का नाम दर्ज करें।');
    return;
  }

  if (id) {
    const idx = stockList.findIndex(s => s.id === id);
    if (idx !== -1) {
      // USER REQUIREMENT 5: Rate is NOT stored in stock
      stockList[idx] = { id, name, hsn, unit, qty: qty ? parseFloat(qty) : '' };
      showToast('सामान अपडेट हो गया।', 'success');
    }
  } else {
    const newItem = {
      id: 's_' + Date.now(),
      name, hsn, unit, qty: qty ? parseFloat(qty) : ''
    };
    stockList.push(newItem);
    showToast('नया सामान स्टॉक में जुड़ गया।', 'success');
  }

  Storage.saveStock(stockList);
  renderStockTable();
  renderBillInputRows(); // Re-render row datalists
  closeModal('stockModal');
}

function deleteStock(id) {
  const s = stockList.find(x => x.id === id);
  if (!s) return;

  if (confirm(`क्या आप "${s.name}" को स्टॉक सूची से हटाना चाहते हैं?`)) {
    stockList = stockList.filter(x => x.id !== id);
    Storage.saveStock(stockList);
    renderStockTable();
    renderBillInputRows();
    showToast('सामान हटा दिया गया।', 'info');
  }
}

// ====================================================================
// SHOP SETTINGS & MODALS
// ====================================================================
function setupModals() {
  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  // Close on overlay backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // State code auto-update in Customer Modal
  const custStateSelect = document.getElementById('custFormState');
  if (custStateSelect) {
    custStateSelect.addEventListener('change', (e) => {
      const selected = INDIAN_STATES.find(s => s.name === e.target.value);
      document.getElementById('custFormStateCode').value = selected ? selected.code : '';
    });
  }

  // Quick Add Customer button from Bill Screen
  document.getElementById('btnQuickAddCustomer').addEventListener('click', () => {
    openCustomerModal();
  });

  // Open Add Customer / Stock from tabs
  document.getElementById('btnOpenAddCustomerModal').addEventListener('click', () => openCustomerModal());
  document.getElementById('btnOpenAddStockModal').addEventListener('click', () => openStockModal());

  // Search input listeners
  document.getElementById('searchCustomersInput').addEventListener('input', (e) => {
    renderCustomerTable(e.target.value);
  });

  document.getElementById('searchStockInput').addEventListener('input', (e) => {
    renderStockTable(e.target.value);
  });

  // Form submit listeners
  document.getElementById('customerForm').addEventListener('submit', saveCustomer);
  document.getElementById('stockForm').addEventListener('submit', saveStock);

  // Shop Settings button & form
  document.getElementById('btnShopSettings').addEventListener('click', () => {
    openModal('shopSettingsModal');
  });

  document.getElementById('shopSettingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    shopInfo = {
      shopName: document.getElementById('setShopName').value.trim(),
      subtitle: document.getElementById('setSubtitle').value.trim(),
      ownerName: document.getElementById('setOwnerName').value.trim(),
      mobile: document.getElementById('setMobile').value.trim(),
      gstin: document.getElementById('setGstin').value.trim(),
      address: document.getElementById('setAddress').value.trim(),
      bankName: document.getElementById('setBankName').value.trim(),
      bankBranch: document.getElementById('setBankBranch').value.trim(),
      accountNo: document.getElementById('setAccountNo').value.trim(),
      ifscCode: document.getElementById('setIfscCode').value.trim(),
      terms: shopInfo.terms || []
    };
    Storage.saveShopInfo(shopInfo);
    renderShopInfoUI();
    closeModal('shopSettingsModal');
    showToast('दुकान जानकारी अपडेट हो गई।', 'success');
  });
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

// Backup & Restore
function setupBackupRestore() {
  document.getElementById('btnBackup').addEventListener('click', () => {
    Storage.exportBackup();
    showToast('डेटा बैकअप डाउनलोड हो गया! (Backup downloaded)', 'success');
  });

  const fileInput = document.getElementById('restoreFileInput');
  document.getElementById('btnRestoreTrigger').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = Storage.importBackup(evt.target.result);
      if (res.success) {
        shopInfo = Storage.getShopInfo();
        customers = Storage.getCustomers();
        stockList = Storage.getStock();

        renderShopInfoUI();
        renderCustomerTable();
        renderStockTable();
        updateCustomerDataList();
        renderBillInputRows();
        updateBillCalculationsAndPreview();

        showToast('डेटा सफलतापूर्वक रीस्टोर हो गया! (Data restored)', 'success');
      } else {
        alert('डेटा रीस्टोर करने में त्रुटि: ' + res.error);
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
