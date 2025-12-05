// Star Academy Classroom Café POS
// All data is stored in localStorage so students can practice safely.

const TAX_RATE = 0.085;
const STORAGE_KEY = "starAcademyCafe_v1";

// ---------- Data ----------

const initialProducts = [
  {
    id: "drip-coffee",
    name: "Drip Coffee",
    category: "Beverages",
    price: 2.5,
    stock: 50,
    description: "Fresh brewed coffee"
  },
  {
    id: "hot-chocolate",
    name: "Hot Chocolate",
    category: "Beverages",
    price: 3.0,
    stock: 39,
    description: "Rich and creamy hot chocolate"
  },
  {
    id: "hot-tea",
    name: "Hot Tea",
    category: "Beverages",
    price: 2.25,
    stock: 40,
    description: "Assorted hot teas"
  },
  {
    id: "iced-tea",
    name: "Iced Tea",
    category: "Beverages",
    price: 2.75,
    stock: 35,
    description: "Refreshing iced tea with lemon"
  },
  {
    id: "cookie",
    name: "Cookie",
    category: "Baked Goods",
    price: 2.0,
    stock: 40,
    description: "Chocolate chip cookie"
  },
  {
    id: "muffin",
    name: "Muffin",
    category: "Baked Goods",
    price: 2.25,
    stock: 30,
    description: "Assorted muffins"
  },
  {
    id: "brownie",
    name: "Brownie",
    category: "Baked Goods",
    price: 2.5,
    stock: 30,
    description: "Fudgy chocolate brownie"
  },
  {
    id: "chips",
    name: "Chips",
    category: "Snacks",
    price: 1.5,
    stock: 35,
    description: "Assorted snack chips"
  }
];

let state = {
  products: initialProducts,
  orders: [], // {id, items, subtotal, tax, total, mode, status, createdAt}
  currentOrder: [], // {productId, qty}
  timeEntries: [], // {id, employee, clockIn, clockOut, hours}
  activeCategory: "All"
};

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state = {
      ...state,
      ...saved,
      // Make sure we always have current schema keys
      activeCategory: saved.activeCategory || "All"
    };
  } catch (e) {
    console.warn("Could not load saved state", e);
  }
}

function saveState() {
  try {
    const toSave = {
      products: state.products,
      orders: state.orders,
      timeEntries: state.timeEntries,
      activeCategory: state.activeCategory
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn("Could not save state", e);
  }
}

// ---------- Helpers ----------

function formatMoney(amount) {
  return "$" + amount.toFixed(2);
}

function findProduct(productId) {
  return state.products.find((p) => p.id === productId);
}

function generateId(prefix) {
  return (
    prefix +
    "-" +
    Math.random().toString(36).slice(2, 7) +
    "-" +
    Date.now().toString(36)
  );
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function computeOrderTotals() {
  let subtotal = 0;
  state.currentOrder.forEach((item) => {
    const p = findProduct(item.productId);
    if (!p) return;
    subtotal += p.price * item.qty;
  });
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// ---------- POS Rendering ----------

function renderCategoryTabs() {
  const container = document.getElementById("categoryTabs");
  container.innerHTML = "";

  const categories = new Set(state.products.map((p) => p.category));
  const allCats = ["All", ...Array.from(categories).sort()];

  allCats.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className =
      "category-tab" + (state.activeCategory === cat ? " category-tab-active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      state.activeCategory = cat;
      renderProducts();
      saveState();
    });
    container.appendChild(btn);
  });
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  const products = state.products.filter((p) => {
    if (state.activeCategory === "All") return true;
    return p.category === state.activeCategory;
  });

  products.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card-image"></div>
      <div class="product-card-body">
        <div class="product-meta-row">
          <span class="badge-stock">Stock: ${p.stock}</span>
        </div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">${formatMoney(p.price)}</div>
      </div>
    `;
    card.addEventListener("click", () => addToOrder(p.id));
    grid.appendChild(card);
  });
}

function addToOrder(productId) {
  const product = findProduct(productId);
  if (!product) return;
  if (product.stock <= 0) {
    alert("This item is out of stock.");
    return;
  }
  const existing = state.currentOrder.find((it) => it.productId === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.currentOrder.push({ productId, qty: 1 });
  }
  renderOrder();
}

function changeOrderQty(productId, delta) {
  const item = state.currentOrder.find((it) => it.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.currentOrder = state.currentOrder.filter(
      (it) => it.productId !== productId
    );
  }
  renderOrder();
}

function clearOrder() {
  state.currentOrder = [];
  renderOrder();
}

function renderOrder() {
  const container = document.getElementById("orderItems");
  const countLabel = document.getElementById("orderItemCount");
  container.innerHTML = "";

  if (state.currentOrder.length === 0) {
    container.classList.add("empty");
    container.innerHTML =
      '<p class="order-empty-text">No items yet<br/><span>Tap a product to add it</span></p>';
    countLabel.textContent = "0 items";
  } else {
    container.classList.remove("empty");
    let totalItems = 0;

    state.currentOrder.forEach((item) => {
      const product = findProduct(item.productId);
      if (!product) return;
      totalItems += item.qty;
      const row = document.createElement("div");
      row.className = "order-item-row";
      row.innerHTML = `
        <div class="order-item-main">
          <div class="order-item-name">${product.name}</div>
          <div class="order-item-controls">
            <button class="qty-btn" data-delta="-1">−</button>
            <div class="qty-value">${item.qty}</div>
            <button class="qty-btn" data-delta="1">+</button>
          </div>
        </div>
        <div class="order-item-price">${formatMoney(
          product.price * item.qty
        )}</div>
      `;
      const minusBtn = row.querySelector('button[data-delta="-1"]');
      const plusBtn = row.querySelector('button[data-delta="1"]');
      minusBtn.addEventListener("click", () =>
        changeOrderQty(item.productId, -1)
      );
      plusBtn.addEventListener("click", () =>
        changeOrderQty(item.productId, +1)
      );
      container.appendChild(row);
    });

    countLabel.textContent =
      totalItems === 1 ? "1 item" : `${totalItems} items`;
  }

  const { subtotal, tax, total } = computeOrderTotals();
  document.getElementById("orderSubtotal").textContent = formatMoney(subtotal);
  document.getElementById("orderTax").textContent = formatMoney(tax);
  document.getElementById("orderTotal").textContent = formatMoney(total);
}

// ---------- Completing Orders ----------

function completeOrder(mode) {
  if (state.currentOrder.length === 0) {
    alert("Add at least one item to the order.");
    return;
  }

  const totals = computeOrderTotals();
  const order = {
    id: generateId("order"),
    items: state.currentOrder.map((item) => ({
      ...item
    })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    mode, // "cash" | "card" | "training"
    status: "pending",
    createdAt: new Date().toISOString()
  };

  state.orders.push(order);

  // For cash or card practice, reduce stock.
  if (mode !== "training") {
    order.items.forEach((item) => {
      const product = findProduct(item.productId);
      if (product) {
        product.stock = Math.max(0, product.stock - item.qty);
      }
    });
  }

  state.currentOrder = [];
  saveState();
  renderOrder();
  renderInventory();
  renderDashboard();
  renderBarista();

  if (mode === "training") {
    alert("Training order created (inventory unchanged).");
  } else if (mode === "cash") {
    alert("Cash sale recorded. Great job!");
  } else {
    alert("Card practice sale recorded.");
  }
}

// ---------- Barista View ----------

function renderBarista() {
  const container = document.getElementById("baristaOrders");
  container.innerHTML = "";

  const pending = state.orders.filter((o) => o.status === "pending");
  if (pending.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No open orders yet.";
    empty.className = "small-muted";
    container.appendChild(empty);
    return;
  }

  pending
    .slice()
    .reverse()
    .forEach((order) => {
      const card = document.createElement("div");
      card.className = "barista-card";

      const header = document.createElement("div");
      header.className = "barista-card-header";

      const left = document.createElement("div");
      left.innerHTML = `
        <div class="barista-order-id">Order #${order.id.slice(-4)}</div>
        <div class="barista-time">${formatDateTime(order.createdAt)}</div>
      `;

      const status = document.createElement("div");
      status.className = "badge-status pending";
      status.textContent = "Pending";

      header.appendChild(left);
      header.appendChild(status);

      const itemsDiv = document.createElement("div");
      itemsDiv.className = "barista-items";
      itemsDiv.innerHTML = order.items
        .map((item) => {
          const p = findProduct(item.productId);
          const name = p ? p.name : "Item";
          return `${item.qty}× ${name}`;
        })
        .join("<br/>");

      const footer = document.createElement("div");
      footer.className = "barista-footer";
      footer.innerHTML = `
        <div class="barista-total">${formatMoney(order.total)}</div>
      `;

      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = "Mark Ready";
      btn.addEventListener("click", () => {
        order.status = "ready";
        saveState();
        renderBarista();
      });

      footer.appendChild(btn);

      card.appendChild(header);
      card.appendChild(itemsDiv);
      card.appendChild(footer);
      container.appendChild(card);
    });
}

// ---------- Menu (customer board) ----------

function renderMenu() {
  const container = document.getElementById("menuContent");
  container.innerHTML = "";

  // Hero logo + title
  const hero = document.createElement("div");
  hero.className = "menu-hero";
  hero.innerHTML = `
    <div class="menu-logo-circle">⭐</div>
    <div class="menu-logo-text-main">STAR ACADEMY</div>
    <div class="menu-logo-text-sub">UNDERSTANDING DIFFERENCES · EXPANDING OPPORTUNITIES</div>
    <div class="menu-tagline">Classroom Café</div>
  `;
  container.appendChild(hero);

  const byCat = {};
  state.products.forEach((p) => {
    if (!byCat[p.category]) byCat[p.category] = [];
    byCat[p.category].push(p);
  });

  Object.keys(byCat)
    .sort()
    .forEach((cat) => {
      const section = document.createElement("section");
      section.className = "menu-section";

      const title = document.createElement("h2");
      title.className = "menu-section-title";
      title.textContent = cat;
      section.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "menu-grid";

      byCat[cat].forEach((p) => {
        const card = document.createElement("div");
        card.className = "menu-card";
        card.innerHTML = `
          <div class="menu-card-name">${p.name}</div>
          <div class="menu-card-desc">${p.description || ""}</div>
          <div class="menu-card-price">${formatMoney(p.price)}</div>
        `;
        grid.appendChild(card);
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
}

// ---------- Inventory ----------

function renderInventory() {
  const tbody = document.getElementById("inventoryTableBody");
  tbody.innerHTML = "";

  state.products.forEach((p) => {
    const tr = document.createElement("tr");

    const statusTd = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.classList.add("status-pill");
    if (p.stock <= 0) {
      statusSpan.classList.add("status-out");
      statusSpan.textContent = "Out of Stock";
    } else if (p.stock < 10) {
      statusSpan.classList.add("status-low");
      statusSpan.textContent = "Low";
    } else {
      statusSpan.classList.add("status-instock");
      statusSpan.textContent = "In Stock";
    }

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.stock}</td>
      <td>${formatMoney(p.price)}</td>
    `;
    statusTd.appendChild(statusSpan);
    tr.appendChild(statusTd);

    const actionsTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "btn-small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editProduct(p.id));
    actionsTd.appendChild(editBtn);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });
}

function editProduct(productId) {
  const product = findProduct(productId);
  if (!product) return;

  const newStockStr = prompt(
    `Update stock for ${product.name}:`,
    String(product.stock)
  );
  if (newStockStr === null) return;
  const newStock = Number(newStockStr);
  if (!Number.isFinite(newStock) || newStock < 0) {
    alert("Please enter a non-negative number for stock.");
    return;
  }

  const newPriceStr = prompt(
    `Update price for ${product.name}:`,
    String(product.price.toFixed(2))
  );
  if (newPriceStr === null) return;
  const newPrice = Number(newPriceStr);
  if (!Number.isFinite(newPrice) || newPrice < 0) {
    alert("Please enter a non-negative number for price.");
    return;
  }

  product.stock = newStock;
  product.price = newPrice;
  saveState();
  renderInventory();
  renderProducts();
  renderMenu();
}

// ---------- Dashboard ----------

function renderDashboard() {
  const nonTraining = state.orders.filter((o) => o.mode !== "training");
  const training = state.orders.filter((o) => o.mode === "training");

  let totalRevenue = 0;
  nonTraining.forEach((o) => (totalRevenue += o.total));

  const totalOrders = nonTraining.length;
  const avgSale = totalOrders ? totalRevenue / totalOrders : 0;

  document.getElementById("dashTotalRevenue").textContent = formatMoney(
    totalRevenue
  );
  document.getElementById("dashTotalOrders").textContent =
    String(totalOrders);
  document.getElementById("dashAvgSale").textContent = formatMoney(avgSale);
  document.getElementById("dashTrainingOrders").textContent =
    String(training.length);
}

// ---------- Time Tracking ----------

function clockIn(name) {
  if (!name) {
    alert("Please enter a name.");
    return;
  }
  const openEntry = state.timeEntries.find(
    (e) => e.employee === name && !e.clockOut
  );
  if (openEntry) {
    alert(`${name} is already clocked in.`);
    return;
  }
  state.timeEntries.push({
    id: generateId("shift"),
    employee: name,
    clockIn: new Date().toISOString(),
    clockOut: null,
    hours: null
  });
  saveState();
  renderTimeTracking();
}

function clockOut(name) {
  if (!name) {
    alert("Please enter a name.");
    return;
  }
  const openEntry = state.timeEntries
    .slice()
    .reverse()
    .find((e) => e.employee === name && !e.clockOut);
  if (!openEntry) {
    alert(`${name} does not have an open shift.`);
    return;
  }
  openEntry.clockOut = new Date().toISOString();
  const start = new Date(openEntry.clockIn).getTime();
  const end = new Date(openEntry.clockOut).getTime();
  const hours = (end - start) / (1000 * 60 * 60);
  openEntry.hours = Math.max(0, hours);
  saveState();
  renderTimeTracking();
}

function renderTimeTracking() {
  const tbody = document.getElementById("timeTableBody");
  tbody.innerHTML = "";

  state.timeEntries
    .slice()
    .reverse()
    .forEach((entry) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${entry.employee}</td>
        <td>${entry.clockIn ? formatDateTime(entry.clockIn) : "-"}</td>
        <td>${entry.clockOut ? formatDateTime(entry.clockOut) : "—"}</td>
        <td>${entry.hours != null ? entry.hours.toFixed(2) : ""}</td>
      `;
      tbody.appendChild(tr);
    });
}

// ---------- Products (read-only list + add) ----------

function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  tbody.innerHTML = "";
  state.products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${formatMoney(p.price)}</td>
      <td>${p.stock}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setupAddProductForm() {
  const btn = document.getElementById("addProductBtn");
  btn.addEventListener("click", () => {
    const nameInput = document.getElementById("newProdName");
    const catInput = document.getElementById("newProdCategory");
    const priceInput = document.getElementById("newProdPrice");
    const stockInput = document.getElementById("newProdStock");

    const name = nameInput.value.trim();
    const category = catInput.value.trim() || "Other";
    const price = Number(priceInput.value);
    const stock = Number(stockInput.value || "0");

    if (!name || !Number.isFinite(price)) {
      alert("Please provide at least a name and a valid price.");
      return;
    }

    const newProduct = {
      id: generateId("prod"),
      name,
      category,
      price: Math.max(0, price),
      stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
      description: ""
    };

    state.products.push(newProduct);
    nameInput.value = "";
    catInput.value = "";
    priceInput.value = "";
    stockInput.value = "";

    saveState();
    renderCategoryTabs();
    renderProducts();
    renderMenu();
    renderInventory();
    renderProductsTable();
  });
}

// ---------- Navigation ----------

function activateView(id) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("nav-item-active", btn.dataset.target === id);
  });
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("view-active", v.id === id);
  });

  switch (id) {
    case "pos":
      renderPOS();
      break;
    case "barista":
      renderBarista();
      break;
    case "menu":
      renderMenu();
      break;
    case "dashboard":
      renderDashboard();
      break;
    case "inventory":
      renderInventory();
      break;
    case "time":
      renderTimeTracking();
      break;
    case "products":
      renderProductsTable();
      break;
  }
}

function renderPOS() {
  renderCategoryTabs();
  renderProducts();
  renderOrder();
}

// ---------- Initialisation ----------

document.addEventListener("DOMContentLoaded", () => {
  loadState();

  // Sidebar nav clicks
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      activateView(btn.dataset.target);
    });
  });

  // Back button in Menu
  const backBtn = document.querySelector("#menu .back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => activateView("pos"));
  }

  // POS buttons
  document
    .getElementById("cashPaymentBtn")
    .addEventListener("click", () => completeOrder("cash"));
  document
    .getElementById("cardPracticeBtn")
    .addEventListener("click", () => completeOrder("card"));
  document
    .getElementById("trainingOrderBtn")
    .addEventListener("click", () => completeOrder("training"));

  // Time tracking
  const nameInput = document.getElementById("timeEmployeeName");
  document
    .getElementById("clockInBtn")
    .addEventListener("click", () => clockIn(nameInput.value.trim()));
  document
    .getElementById("clockOutBtn")
    .addEventListener("click", () => clockOut(nameInput.value.trim()));

  // Add product form
  setupAddProductForm();

  // First render
  activateView("pos");
});
