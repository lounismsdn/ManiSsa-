export interface Product {
  id?: number;
  name: string;
  category: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  maxDiscount: number;
  currentStock: number;
  unit: string;
  supplierId: number;
  supplierName: string;
  image: string;
  expiryDate?: string; // YYYY-MM-DD
}

export interface SaleItem {
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
  profit: number;
}

export interface Sale {
  id?: number;
  timestamp: string; // ISO string
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  discountAmount: number;
  netProfit: number;
  items: SaleItem[];
}

export interface StockLog {
  id?: number;
  productId: number;
  productName: string;
  quantityChanged: number;
  type: 'add' | 'remove' | 'sale' | 'adjustment';
  timestamp: string;
  note: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

const DB_NAME = 'ManiSsaDB';
const DB_VERSION = 1;

class ManiSsaDatabase {
  private db: IDBDatabase | null = null;

  init(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // Products Store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
          productStore.createIndex('name', 'name', { unique: false });
          productStore.createIndex('category', 'category', { unique: false });
        }

        // Sales Store
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
          salesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Stock Logs Store
        if (!db.objectStoreNames.contains('stock_logs')) {
          const stockLogsStore = db.createObjectStore('stock_logs', { keyPath: 'id', autoIncrement: true });
          stockLogsStore.createIndex('productId', 'productId', { unique: false });
        }

        // Customers Store
        if (!db.objectStoreNames.contains('customers')) {
          const customersStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
          customersStore.createIndex('phone', 'phone', { unique: true });
        }

        // Suppliers Store
        if (!db.objectStoreNames.contains('suppliers')) {
          const suppliersStore = db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
          suppliersStore.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  async seedData(): Promise<void> {
    await this.init();

    // Check if products store is empty
    const productCount = await this.getProductCount();
    if (productCount > 0) return; // Already seeded

    console.log('Seeding initial data for ManiSsa...');

    // Seed Suppliers
    const suppliers: Supplier[] = [
      { name: 'Al-Baraka Honey Apiaries', phone: '+213 550 12 34 56', email: 'contact@albarakaapiary.com', notes: 'Premium Sidr and Forest Honey producer.' },
      { name: 'Sidi Ali Olive Press', phone: '+213 560 98 76 54', email: 'press@sidialiolives.com', notes: 'Extra Virgin olive oil coop in Kabylie.' },
      { name: 'Sahara Gold Dates Coop', phone: '+213 661 22 33 44', email: 'sales@saharagold.dz', notes: 'Premium Tolga Deglet Nour dates.' },
      { name: 'Aurès Organic Herb Cooperative', phone: '+213 770 44 55 66', email: 'info@auresherbs.dz', notes: 'Wild mountain herbs supplier.' }
    ];

    const supplierIds: number[] = [];
    for (const sup of suppliers) {
      try {
        const id = await this.addSupplier(sup);
        supplierIds.push(id);
      } catch (e) {
        // Fallback to find existing supplier ID by name
        const existing = await this.getSuppliers();
        const found = existing.find(s => s.name === sup.name);
        supplierIds.push(found?.id || 1);
      }
    }

    // Seed Customers
    const customers: Customer[] = [
      { name: 'Kamel Benali', phone: '0555112233', email: 'kamel.b@gmail.com', notes: 'Regular honey buyer.' },
      { name: 'Amine Slimani', phone: '0666445566', email: 'amine.s@yahoo.fr', notes: 'Buys olive oil in bulk (5L containers).' },
      { name: 'Fatima Zohra', phone: '0777889900', email: 'fatimaz@gmail.com', notes: 'Purchases Dates and Herbs regularly.' }
    ];
    for (const cust of customers) {
      try {
        await this.addCustomer(cust);
      } catch (e) {
        // Ignore duplicate phone constraint
      }
    }

    // Seed Products
    const products: Product[] = [
      {
        name: 'Royal Sidr Honey',
        category: 'Honey',
        description: 'Exquisite, rare Sidr honey harvested from wild Sidr trees. Renowned for its rich texture and medicinal benefits.',
        purchasePrice: 5500,
        sellingPrice: 8500,
        maxDiscount: 1000,
        currentStock: 15,
        unit: 'kg',
        supplierId: supplierIds[0],
        supplierName: suppliers[0].name,
        image: 'sidr_honey',
        expiryDate: '2028-12-31'
      },
      {
        name: 'Wild Thyme Honey',
        category: 'Honey',
        description: 'Aromatic honey with strong herbal notes, collected by bees feeding on mountain wild thyme. Excellent for winter remedies.',
        purchasePrice: 3500,
        sellingPrice: 5200,
        maxDiscount: 500,
        currentStock: 25,
        unit: 'kg',
        supplierId: supplierIds[0],
        supplierName: suppliers[0].name,
        image: 'thyme_honey',
        expiryDate: '2028-08-15'
      },
      {
        name: 'Extra Virgin Olive Oil (Cold Pressed)',
        category: 'Olive Oil',
        description: 'First cold-pressed extra virgin olive oil from early harvest olives. Fruity flavor with a light peppery finish.',
        purchasePrice: 900,
        sellingPrice: 1300,
        maxDiscount: 100,
        currentStock: 150,
        unit: 'liter',
        supplierId: supplierIds[1],
        supplierName: suppliers[1].name,
        image: 'olive_oil',
        expiryDate: '2027-11-30'
      },
      {
        name: 'Deglet Nour Dates (Premium Tolga)',
        category: 'Dates',
        description: 'Top-tier Deglet Nour honey dates on branches. Naturally sweet, translucent, and incredibly soft.',
        purchasePrice: 450,
        sellingPrice: 750,
        maxDiscount: 50,
        currentStock: 80,
        unit: 'kg',
        supplierId: supplierIds[2],
        supplierName: suppliers[2].name,
        image: 'deglet_nour',
        expiryDate: '2026-11-20'
      },
      {
        name: 'Organic Wild Rosemary',
        category: 'Herbs',
        description: 'Sun-dried wild rosemary leaves collected from the Aurès mountain peaks. Packed with aromatic oils.',
        purchasePrice: 150,
        sellingPrice: 350,
        maxDiscount: 30,
        currentStock: 10,
        unit: 'kg',
        supplierId: supplierIds[3],
        supplierName: suppliers[3].name,
        image: 'rosemary',
        expiryDate: '2027-06-01'
      },
      {
        name: 'Cold Pressed Sweet Almond Oil',
        category: 'Natural Oils',
        description: 'Pure cosmetic-grade sweet almond oil. Excellent moisturizer for skin and hair health.',
        purchasePrice: 800,
        sellingPrice: 1500,
        maxDiscount: 200,
        currentStock: 35,
        unit: 'bottle',
        supplierId: supplierIds[3],
        supplierName: suppliers[3].name,
        image: 'almond_oil',
        expiryDate: '2028-02-15'
      }
    ];

    for (const prod of products) {
      const prodId = await this.addProduct(prod);
      // Log initial stock movement
      await this.addStockLog({
        productId: prodId,
        productName: prod.name,
        quantityChanged: prod.currentStock,
        type: 'add',
        timestamp: new Date().toISOString(),
        note: 'Initial stock seeding.'
      });
    }

    // Seed some mock sales to populate the charts on load
    await this.seedMockSales();
  }

  private async seedMockSales(): Promise<void> {
    const products = await this.getProducts();
    if (products.length < 3) return;

    const baseDate = new Date();
    
    // Create sales over the past 7 days to give beautiful reports
    const mockSalesData = [
      {
        daysAgo: 6,
        items: [
          { prodIndex: 2, qty: 5, discount: 0 }, // Olive oil
          { prodIndex: 3, qty: 3, discount: 50 } // Dates
        ],
        customer: 'Amine Slimani'
      },
      {
        daysAgo: 5,
        items: [
          { prodIndex: 0, qty: 1, discount: 200 }, // Sidr Honey
          { prodIndex: 4, qty: 2, discount: 0 } // Rosemary
        ],
        customer: 'Kamel Benali'
      },
      {
        daysAgo: 4,
        items: [
          { prodIndex: 1, qty: 2, discount: 100 }, // Thyme Honey
          { prodIndex: 2, qty: 10, discount: 500 } // Olive Oil
        ],
        customer: 'Amine Slimani'
      },
      {
        daysAgo: 3,
        items: [
          { prodIndex: 3, qty: 8, discount: 0 } // Dates
        ],
        customer: 'Fatima Zohra'
      },
      {
        daysAgo: 2,
        items: [
          { prodIndex: 0, qty: 2, discount: 500 }, // Sidr honey
          { prodIndex: 2, qty: 4, discount: 0 } // Olive oil
        ],
        customer: 'Kamel Benali'
      },
      {
        daysAgo: 1,
        items: [
          { prodIndex: 1, qty: 1, discount: 0 }, // Thyme honey
          { prodIndex: 5, qty: 3, discount: 100 } // Almond Oil
        ],
        customer: 'Fatima Zohra'
      }
    ];

    for (const saleSetup of mockSalesData) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() - saleSetup.daysAgo);
      date.setHours(10 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60));

      const saleItems: SaleItem[] = [];
      let totalAmount = 0;
      let discountAmount = 0;
      let netProfit = 0;

      for (const itemSetup of saleSetup.items) {
        const prod = products[itemSetup.prodIndex];
        const qty = itemSetup.qty;
        const disc = itemSetup.discount;
        const total = (prod.sellingPrice * qty) - disc;
        const cost = prod.purchasePrice * qty;
        const profit = total - cost;

        saleItems.push({
          productId: prod.id!,
          productName: prod.name,
          quantity: qty,
          unit: prod.unit,
          unitPrice: prod.sellingPrice,
          discount: disc,
          total: total,
          profit: profit
        });

        totalAmount += total;
        discountAmount += disc;
        netProfit += profit;
      }

      const sale: Sale = {
        timestamp: date.toISOString(),
        customerName: saleSetup.customer,
        customerPhone: saleSetup.customer === 'Kamel Benali' ? '0555112233' : saleSetup.customer === 'Amine Slimani' ? '0666445566' : '0777889900',
        totalAmount,
        discountAmount,
        netProfit,
        items: saleItems
      };

      // Direct write to sales table
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore(transaction.objectStoreNames[0]);
        const req = store.add(sale);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  }

  // Count helper
  private getProductCount(): Promise<number> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }

  // --- CRUD Operations: Products ---
  getProducts(): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  addProduct(product: Product): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      const request = store.add(product);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  updateProduct(product: Product): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      const request = store.put(product);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  deleteProduct(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD Operations: Stock Logs ---
  getStockLogs(): Promise<StockLog[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['stock_logs'], 'readonly');
      const store = transaction.objectStore('stock_logs');
      const request = store.getAll();
      request.onsuccess = () => {
        const logs = request.result || [];
        // Sort newest first
        resolve(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  addStockLog(log: StockLog): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['stock_logs'], 'readwrite');
      const store = transaction.objectStore('stock_logs');
      const request = store.add(log);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  // Update stock level helper
  async adjustStock(productId: number, qtyChange: number, type: 'add' | 'remove' | 'adjustment', note: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products', 'stock_logs'], 'readwrite');
      const productStore = transaction.objectStore('products');
      const logStore = transaction.objectStore('stock_logs');

      const getReq = productStore.get(productId);

      getReq.onsuccess = () => {
        const product = getReq.result as Product;
        if (!product) {
          reject(new Error('Product not found'));
          return;
        }

        product.currentStock = Math.max(0, product.currentStock + qtyChange);
        const putReq = productStore.put(product);

        putReq.onsuccess = () => {
          const log: StockLog = {
            productId,
            productName: product.name,
            quantityChanged: qtyChange,
            type,
            timestamp: new Date().toISOString(),
            note
          };
          const addLogReq = logStore.add(log);
          addLogReq.onsuccess = () => resolve();
          addLogReq.onerror = () => reject(addLogReq.error);
        };

        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  // --- CRUD Operations: Sales ---
  getSales(): Promise<Sale[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sales'], 'readonly');
      const store = transaction.objectStore('sales');
      const request = store.getAll();
      request.onsuccess = () => {
        const sales = request.result || [];
        // Sort newest first
        resolve(sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addSale(sale: Sale): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      // Transaction encompassing products, sales, and stock_logs
      const transaction = db.transaction(['products', 'sales', 'stock_logs'], 'readwrite');
      const productStore = transaction.objectStore('products');
      const salesStore = transaction.objectStore('sales');
      const logStore = transaction.objectStore('stock_logs');

      // 1. Process stock deduction for all sale items
      const deductionPromises = sale.items.map(item => {
        return new Promise<void>((resolveItem, rejectItem) => {
          const getReq = productStore.get(item.productId);
          getReq.onsuccess = () => {
            const product = getReq.result as Product;
            if (product) {
              product.currentStock = Math.max(0, product.currentStock - item.quantity);
              const putReq = productStore.put(product);
              putReq.onsuccess = () => {
                // Log stock movement
                const log: StockLog = {
                  productId: item.productId,
                  productName: product.name,
                  quantityChanged: -item.quantity,
                  type: 'sale',
                  timestamp: sale.timestamp,
                  note: `POS Sale #${sale.id || 'Pending'}`
                };
                const addLogReq = logStore.add(log);
                addLogReq.onsuccess = () => resolveItem();
                addLogReq.onerror = () => rejectItem(addLogReq.error);
              };
              putReq.onerror = () => rejectItem(putReq.error);
            } else {
              rejectItem(new Error(`Product ${item.productId} not found for stock deduction.`));
            }
          };
          getReq.onerror = () => rejectItem(getReq.error);
        });
      });

      Promise.all(deductionPromises)
        .then(() => {
          // 2. Write Sale record
          const addSaleReq = salesStore.add(sale);
          addSaleReq.onsuccess = () => resolve(addSaleReq.result as number);
          addSaleReq.onerror = () => reject(addSaleReq.error);
        })
        .catch(err => {
          console.error('Sale transaction failed during stock updates:', err);
          reject(err);
        });
    });
  }

  // --- CRUD Operations: Customers ---
  getCustomers(): Promise<Customer[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['customers'], 'readonly');
      const store = transaction.objectStore('customers');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  addCustomer(customer: Customer): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['customers'], 'readwrite');
      const store = transaction.objectStore('customers');
      const request = store.add(customer);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  updateCustomer(customer: Customer): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['customers'], 'readwrite');
      const store = transaction.objectStore('customers');
      const request = store.put(customer);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  deleteCustomer(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['customers'], 'readwrite');
      const store = transaction.objectStore('customers');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD Operations: Suppliers ---
  getSuppliers(): Promise<Supplier[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['suppliers'], 'readonly');
      const store = transaction.objectStore('suppliers');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  addSupplier(supplier: Supplier): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['suppliers'], 'readwrite');
      const store = transaction.objectStore('suppliers');
      const request = store.add(supplier);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  updateSupplier(supplier: Supplier): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['suppliers'], 'readwrite');
      const store = transaction.objectStore('suppliers');
      const request = store.put(supplier);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  deleteSupplier(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['suppliers'], 'readwrite');
      const store = transaction.objectStore('suppliers');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Backup and Reset operations ---
  async exportBackup(): Promise<string> {
    const products = await this.getProducts();
    const sales = await this.getSales();
    const stockLogs = await this.getStockLogs();
    const customers = await this.getCustomers();
    const suppliers = await this.getSuppliers();

    const dataBackup = {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      products,
      sales,
      stockLogs,
      customers,
      suppliers
    };

    return JSON.stringify(dataBackup, null, 2);
  }

  async importBackup(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    if (!data.products || !data.sales) {
      throw new Error('Invalid backup file structure.');
    }

    const db = await this.init();

    // Clear existing stores
    const stores = ['products', 'sales', 'stock_logs', 'customers', 'suppliers'];
    const clearTransaction = db.transaction(stores, 'readwrite');
    for (const storeName of stores) {
      clearTransaction.objectStore(storeName).clear();
    }

    // Wait for clears to complete
    await new Promise<void>((resolve, reject) => {
      clearTransaction.oncomplete = () => resolve();
      clearTransaction.onerror = () => reject(clearTransaction.error);
    });

    // Populate data
    const populateTransaction = db.transaction(stores, 'readwrite');

    if (data.products) {
      const pStore = populateTransaction.objectStore('products');
      data.products.forEach((p: Product) => pStore.add(p));
    }
    if (data.sales) {
      const sStore = populateTransaction.objectStore('sales');
      data.sales.forEach((s: Sale) => sStore.add(s));
    }
    if (data.stockLogs) {
      const slStore = populateTransaction.objectStore('stock_logs');
      data.stockLogs.forEach((sl: StockLog) => slStore.add(sl));
    }
    if (data.customers) {
      const cStore = populateTransaction.objectStore('customers');
      data.customers.forEach((c: Customer) => cStore.add(c));
    }
    if (data.suppliers) {
      const supStore = populateTransaction.objectStore('suppliers');
      data.suppliers.forEach((sup: Supplier) => supStore.add(sup));
    }

    return new Promise((resolve, reject) => {
      populateTransaction.oncomplete = () => resolve();
      populateTransaction.onerror = () => reject(populateTransaction.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.init();
    const stores = ['products', 'sales', 'stock_logs', 'customers', 'suppliers'];
    const transaction = db.transaction(stores, 'readwrite');
    for (const storeName of stores) {
      transaction.objectStore(storeName).clear();
    }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const db = new ManiSsaDatabase();
