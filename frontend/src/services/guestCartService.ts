export interface GuestCartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  category?: string;
  stock: number;
}

export interface GuestCart {
  items: GuestCartItem[];
  totalAmount: number;
}

const GUEST_CART_KEY = 'guestCart';

export const guestCartService = {
  getCart(): GuestCart {
    try {
      const cartData = sessionStorage.getItem(GUEST_CART_KEY);
      if (cartData) {
        return JSON.parse(cartData) as GuestCart;
      }
    } catch (error) {
      console.error('Error loading guest cart:', error);
    }
    return { items: [], totalAmount: 0 };
  },

  saveCart(cart: GuestCart): void {
    try {
      sessionStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving guest cart:', error);
    }
  },

  addToCart(
    product: {
      id: string;
      name: string;
      price: number;
      image?: string;
      category?: string;
      stock: number;
    },
    quantity = 1,
  ): GuestCart {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const cart = this.getCart();
    const existingItem = cart.items.find((item) => item.productId === product.id);
    const stock = product.stock > 0 ? product.stock : 99;

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > stock) {
        throw new Error(`Chỉ còn ${stock} sản phẩm trong kho`);
      }
      existingItem.quantity = newQuantity;
    } else {
      if (quantity > stock) {
        throw new Error(`Chỉ còn ${stock} sản phẩm trong kho`);
      }
      cart.items.push({
        productId: product.id,
        quantity,
        price: product.price,
        name: product.name,
        image: product.image,
        category: product.category,
        stock,
      });
    }

    cart.totalAmount = this.calculateTotal(cart.items);
    this.saveCart(cart);
    return cart;
  },

  clearCart(): GuestCart {
    const emptyCart = { items: [], totalAmount: 0 };
    this.saveCart(emptyCart);
    return emptyCart;
  },

  calculateTotal(items: GuestCartItem[]): number {
    return Math.max(
      0,
      Number(
        items
          .reduce((total, item) => total + item.price * item.quantity, 0)
          .toFixed(2),
      ),
    );
  },

  getItemQuantity(productId: string): number {
    const item = this.getCart().items.find((i) => i.productId === productId);
    return item ? item.quantity : 0;
  },

  updateQuantity(productId: string, quantity: number): GuestCart {
    const cart = this.getCart();
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) {
      throw new Error('Sản phẩm không có trong giỏ');
    }
    const stock = item.stock > 0 ? item.stock : 99;
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
    } else if (quantity > stock) {
      throw new Error(`Chỉ còn ${stock} sản phẩm trong kho`);
    } else {
      item.quantity = quantity;
    }
    cart.totalAmount = this.calculateTotal(cart.items);
    this.saveCart(cart);
    return cart;
  },

  removeItem(productId: string): GuestCart {
    return this.updateQuantity(productId, 0);
  },
};
