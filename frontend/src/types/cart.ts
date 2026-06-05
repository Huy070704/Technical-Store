export interface CartProductImage {
  id: string;
  url: string;
  alt?: string;
}

export interface CartProduct {
  id: string;
  name: string;
  slug?: string;
  price: number;
  stock: number;
  isActive: boolean;
  images?: CartProductImage[];
  category?: string | { id?: string; name?: string };
}

export interface CartLineItem {
  id: string;
  quantity: number;
  product: CartProduct;
}

export interface ServerCart {
  id: string;
  totalAmount: number;
  cartItems: Array<{
    id: string;
    quantity: number;
    product: CartProduct & {
      category?: { name?: string };
    };
  }>;
}
