// This is an object that holds the state of the application.
const Store = {
  // These lines of code are used to store the cart and user data in the browser's localStorage.
  CART_KEY: "xtore_cart",
  USER_KEY: "xtore_user",
  products: [],

  // This is an asynchronous function that loads the products from the server.
  async loadProducts() {
    const response = await fetch("/items/");
    if (!response.ok)
      throw new Error("Unable to load the catalog.");
    const items = await response.json();
    // This line of code iterates through the items and creates a new object for each item.
    this.products = items.map((item) => ({
      id: String(item.id),
      name: item.title,
      desc: item.description,
      price: item.price,
      stock: item.stock,
      imageUrl: item.image_url,
      color: "#0A7E8C",
    }));
    return this.products;
  },

  getProduct(id) {
    // This line of code finds the product with the given ID in the products array.
    return this.products.find(p => String(p.id) === String(id));
  },

  // Cart is saved per user in localStorage so each n-th user retains their exact cart items across sessions
  // This is an object that holds the state of the cart.
  getCart() {
    const user = this.getUser();
    if (!user) return {};
    try {
      const saved = localStorage.getItem(`${this.CART_KEY}_${user.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  },

  setCart(cart) {
    const user = this.getUser();
    if (user) {
      localStorage.setItem(`${this.CART_KEY}_${user.id}`, JSON.stringify(cart));
    }
  },

  addToCart(id, qty = 1) {
    const user = this.getUser();
    if (!user) {
      return { success: false, reason: "unauthorized", message: "Please sign in to add items to cart." };
    }

    const product = this.getProduct(id);
    const availableStock = product ? product.stock : 999;

    if (availableStock <= 0) {
      return { success: false, reason: "out_of_stock", message: "This item is currently out of stock." };
    }

    const cart = this.getCart();
    const currentQty = cart[id] || 0;

    if (currentQty >= availableStock) {
      return {
        success: false,
        reason: "stock_limit",
        message: `Cannot add more. You already have the maximum available stock (${availableStock}) in your cart.`,
        currentQty: currentQty,
        stock: availableStock
      };
    }

    const newQty = Math.min(currentQty + qty, availableStock);
    cart[id] = newQty;
    this.setCart(cart);

    if (currentQty + qty > availableStock) {
      return {
        success: true,
        capped: true,
        message: `Added to cart. Capped at maximum available stock (${availableStock}).`,
        currentQty: newQty,
        stock: availableStock
      };
    }

    return {
      success: true,
      message: "Added to cart",
      currentQty: newQty,
      stock: availableStock
    };
  },

  setQty(id, qty) {
    const cart = this.getCart();
    const product = this.getProduct(id);
    const availableStock = product ? product.stock : 999;

    if (qty <= 0) {
      delete cart[id];
      this.setCart(cart);
      return { qty: 0, stock: availableStock };
    }

    if (qty > availableStock) {
      cart[id] = availableStock;
      this.setCart(cart);
      return { qty: availableStock, stock: availableStock, capped: true };
    }

    cart[id] = qty;
    this.setCart(cart);
    return { qty: qty, stock: availableStock, capped: false };
  },

  removeFromCart(id) {
    const cart = this.getCart();
    delete cart[id];
    this.setCart(cart);
  },

  clearCart() {
    const user = this.getUser();
    if (user) {
      localStorage.removeItem(`${this.CART_KEY}_${user.id}`);
    }
  },

  cartCount() {
    const cart = this.getCart();
    return Object.values(cart).reduce((a, b) => a + b, 0);
  },

  cartLines() {
    const cart = this.getCart();
    return Object.entries(cart).map(([id, qty]) => {
      const product = this.products.find(p => String(p.id) === String(id));
      return product ? { ...product, qty } : null;
    }).filter(Boolean);
  },

  cartTotals() {
    const lines = this.cartLines();
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const shipping = subtotal === 0 ? 0 : (subtotal > 50 ? 0 : 5.5);
    const tax = +(subtotal * 0.06).toFixed(2);
    const total = +(subtotal + shipping + tax).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), shipping, tax, total };
  },

  // Active user session is stored in sessionStorage so no user remains logged in when re-running or reopening the app
  getUser() {
    try {
      const saved = sessionStorage.getItem(this.USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  logout() {
    sessionStorage.removeItem(this.USER_KEY);
  },

  // This is an asynchronous function that sends a request to the server.
  // This line of code retrieves the current user from the browser's localStorage.
  // This line of code adds the authorization token to the request headers.
  async api(path, options = {}) {
    const user = this.getUser();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (user?.token) headers.Authorization = `Bearer ${user.token}`;
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "Something went wrong.");
    return data;
  },

  async createStripeCheckout(shipTo) {
    const lines = this.cartLines();
    if (lines.length === 0) {
      throw new Error("Your cart is empty.");
    }
    const payload = {
      lines: lines.map(line => ({ item_id: Number(line.id), quantity: line.qty })),
      ship_to: shipTo
    };
    return await this.api("/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

// Purge any legacy persistent user logins from localStorage so application always starts in clean logged-out state
try {
  localStorage.removeItem("xtore_user");
  localStorage.removeItem("lc_user");
} catch (e) {}

function money(n) {
  return "$" + Number(n).toFixed(2);
}

function initials(name) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// This function renders the header state based on the current user and cart.
// This line of code retrieves the current user from the browser's localStorage.
// This line of code retrieves the cart count from the browser's localStorage.
function renderHeaderState() {
  const countEl = document.querySelector("[data-cart-count]");
  const user = Store.getUser();
  const cartLink = document.querySelector(".nav-cart");
  if (cartLink) 
    cartLink.hidden = !user;
  if (countEl) 
    countEl.textContent = Store.cartCount();

  const userSlot = document.querySelector("[data-user-slot]");
  if (userSlot) {
    if (user) {
      userSlot.innerHTML = `Welcome back, <a href="orders.html">${user.name.split(" ")[0]}</a> &middot; <a href="#" id="logout-link">Logout</a>`;
      const logoutLink = document.getElementById("logout-link");
      if (logoutLink) {
        logoutLink.addEventListener("click", (e) => {
          e.preventDefault();
          Store.logout();
          window.location.href = "index.html";
        });
      }
    } else {
      userSlot.innerHTML = `<a href="login.html">Sign in</a> or <a href="signup.html">register</a>`;
    }
  }

  document.querySelectorAll("[data-nav-link]").forEach(a => {
    const currentFile = location.pathname.split("/").pop() || "index.html";
    if (a.getAttribute("href") === currentFile) {
      a.classList.add("active");
    }
  });
}

// This function shows a toast (small pop-up notification) with the given message.
function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}

// This event listener calls the renderHeaderState function when the DOM is loaded.
document.addEventListener("DOMContentLoaded", renderHeaderState);
