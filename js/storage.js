// Storage helper for offline Shop Billing App
const STORAGE_KEYS = {
  SHOP_INFO: 'sawariya_shop_info',
  CUSTOMERS: 'sawariya_customers',
  STOCK: 'sawariya_stock',
  LAST_BILL_NO: 'sawariya_last_bill_no',
  FOLDER_NAME: 'sawariya_saved_folder_name'
};

const DEFAULT_SHOP_INFO = {
  shopName: 'Shree Sawariya Traders',
  subtitle: 'CARDAMOM AND ALL SPICES MERCHANT',
  gstin: '24FJPPK2049G1Z3',
  ownerName: 'Kishorbhai Prajapat',
  mobile: '73833 76049',
  address: 'Shop No. 15, Bhadreshwar Society, B/h. HBK High School, O/s. Delhi Gate, Shahibaug, Ahmedabad-380004.',
  bankName: 'KOTAK MAHINDRA BANK',
  bankBranch: 'SHAHIBAUG BRANCH',
  accountNo: '7383376049',
  ifscCode: 'KKBK0000827',
  terms: [
    'After 15 days Interest will be Charged @ 2%.',
    'No Responsibility after goods are despatched.',
    'It is buyers responsibility to send payment at our Office.'
  ]
};

const DEFAULT_CUSTOMERS = [
  {
    id: 'c_1',
    name: 'Gujarat Spice Mart',
    phone: '98250 12345',
    address: 'Shop 12, APMC Market, Kalupur',
    city: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: '24',
    gstin: '24AAACG1234A1Z5',
    transport: 'Navrang Roadways'
  },
  {
    id: 'c_2',
    name: 'Krishna Kirana Stores',
    phone: '98980 54321',
    address: 'Main Bazar, Station Road',
    city: 'Surat',
    state: 'Gujarat',
    stateCode: '24',
    gstin: '24BBBCK5678B1Z2',
    transport: 'Gujarat Cargo'
  },
  {
    id: 'c_3',
    name: 'Rajdhani Masala Bhandar',
    phone: '97123 45678',
    address: '45 Gandhi Road',
    city: 'Jaipur',
    state: 'Rajasthan',
    stateCode: '08',
    gstin: '08CCCDG9012C1Z8',
    transport: 'Marwar Transport'
  }
];

const DEFAULT_STOCK = [
  { id: 's_1', name: 'Elaichi 8mm (Green Cardamom)', hsn: '', unit: 'Kg.', qty: 150 },
  { id: 's_2', name: 'Elaichi 7.5mm (Green Cardamom)', hsn: '', unit: 'Kg.', qty: 120 },
  { id: 's_3', name: 'Laung (Cloves Best Quality)', hsn: '', unit: 'Kg.', qty: 85 },
  { id: 's_4', name: 'Kali Mirch (Black Pepper 550GL)', hsn: '', unit: 'Kg.', qty: 200 },
  { id: 's_5', name: 'Dalchini (Cinnamon Flat)', hsn: '', unit: 'Kg.', qty: 95 },
  { id: 's_6', name: 'Chakri Phool (Star Anise)', hsn: '', unit: 'Kg.', qty: 60 },
  { id: 's_7', name: 'Javitri (Mace Flower)', hsn: '', unit: 'Kg.', qty: 40 },
  { id: 's_8', name: 'Jaiphal (Nutmeg)', hsn: '', unit: 'Kg.', qty: 75 }
];

const Storage = {
  // Migrate existing data safely without breaking already-saved items/customers
  migrateData() {
    try {
      // 1. Migrate Stock: Remove old default rates and ensure HSN is clean
      const stockRaw = localStorage.getItem(STORAGE_KEYS.STOCK);
      if (stockRaw) {
        const stockArr = JSON.parse(stockRaw);
        if (Array.isArray(stockArr)) {
          let modified = false;
          stockArr.forEach(item => {
            if ('rate' in item) {
              delete item.rate;
              modified = true;
            }
            if (item.hsn === undefined) {
              item.hsn = '';
              modified = true;
            }
          });
          if (modified) {
            localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stockArr));
          }
        }
      }

      // 2. Migrate Customers: Ensure transport and state properties exist
      const custRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (custRaw) {
        const custArr = JSON.parse(custRaw);
        if (Array.isArray(custArr)) {
          let modified = false;
          custArr.forEach(c => {
            if (!('transport' in c)) {
              c.transport = '';
              modified = true;
            }
            if (!('state' in c)) {
              c.state = '';
              modified = true;
            }
            if (!('stateCode' in c)) {
              c.stateCode = '';
              modified = true;
            }
          });
          if (modified) {
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(custArr));
          }
        }
      }
    } catch (e) {
      console.warn('Migration warning:', e);
    }
  },

  getShopInfo() {
    const data = localStorage.getItem(STORAGE_KEYS.SHOP_INFO);
    return data ? JSON.parse(data) : { ...DEFAULT_SHOP_INFO };
  },

  saveShopInfo(info) {
    localStorage.setItem(STORAGE_KEYS.SHOP_INFO, JSON.stringify(info));
  },

  getCustomers() {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [...DEFAULT_CUSTOMERS];
  },

  saveCustomers(customers) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getStock() {
    const data = localStorage.getItem(STORAGE_KEYS.STOCK);
    return data ? JSON.parse(data) : [...DEFAULT_STOCK];
  },

  saveStock(stock) {
    localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
  },

  getLastBillNo() {
    const data = localStorage.getItem(STORAGE_KEYS.LAST_BILL_NO);
    return data ? parseInt(data, 10) : 4624; // Photo starts at 4624
  },

  saveLastBillNo(num) {
    localStorage.setItem(STORAGE_KEYS.LAST_BILL_NO, num.toString());
  },

  getSavedFolderName() {
    return localStorage.getItem(STORAGE_KEYS.FOLDER_NAME) || '';
  },

  setSavedFolderName(name) {
    localStorage.setItem(STORAGE_KEYS.FOLDER_NAME, name);
  },

  // Export full JSON Backup
  exportBackup() {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      shopInfo: this.getShopInfo(),
      customers: this.getCustomers(),
      stock: this.getStock(),
      lastBillNo: this.getLastBillNo()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `ShreeSawariyaTraders_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import JSON Backup
  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.shopInfo) this.saveShopInfo(data.shopInfo);
      if (Array.isArray(data.customers)) {
        // Clean customers
        data.customers.forEach(c => {
          if (!c.transport) c.transport = '';
          if (!c.state) c.state = '';
        });
        this.saveCustomers(data.customers);
      }
      if (Array.isArray(data.stock)) {
        // Clean stock items (strip any old default rates)
        data.stock.forEach(s => {
          delete s.rate;
          if (s.hsn === undefined) s.hsn = '';
        });
        this.saveStock(data.stock);
      }
      if (data.lastBillNo) this.saveLastBillNo(data.lastBillNo);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

// IndexedDB Helper to persist File System Access directory handle
const IDB_CONFIG = {
  DB_NAME: 'SawariyaTradersDB',
  STORE_NAME: 'directoryHandleStore',
  KEY: 'billsDirectoryHandle'
};

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_CONFIG.DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_CONFIG.STORE_NAME)) {
        db.createObjectStore(IDB_CONFIG.STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDirectoryHandle(handle) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_CONFIG.STORE_NAME);
    const req = store.put(handle, IDB_CONFIG.KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getSavedDirectoryHandle() {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_CONFIG.STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_CONFIG.STORE_NAME);
      const req = store.get(IDB_CONFIG.KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}
