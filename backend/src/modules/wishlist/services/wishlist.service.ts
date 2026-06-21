import { Service } from "typedi";
import { Wishlist } from "../models/wishlist.model";
import { Product } from "../../product/models/product.model";
import { EntityNotFoundException } from "@/shared/exceptions/http-exceptions";

@Service()
export class WishlistService {
  /** Lấy danh sách productId trong wishlist của account (mới nhất trước). */
  async getProductIds(accountId: string): Promise<string[]> {
    const items = await Wishlist.find({ account: accountId }).sort({ createdAt: -1 });
    return items.map((w) => w.product.toString());
  }

  /** Thêm/bỏ 1 sản phẩm khỏi wishlist. Trả về trạng thái mới + danh sách id. */
  async toggle(
    accountId: string,
    productId: string
  ): Promise<{ added: boolean; productIds: string[] }> {
    const existing = await Wishlist.findOne({ account: accountId, product: productId });
    let added: boolean;
    if (existing) {
      await Wishlist.deleteOne({ _id: existing._id });
      added = false;
    } else {
      const product = await Product.findById(productId);
      if (!product) throw new EntityNotFoundException("Product");
      await Wishlist.create({ account: accountId, product: productId });
      added = true;
    }
    const productIds = await this.getProductIds(accountId);
    return { added, productIds };
  }

  /** Xóa toàn bộ wishlist của account. */
  async clear(accountId: string): Promise<{ productIds: string[] }> {
    await Wishlist.deleteMany({ account: accountId });
    return { productIds: [] };
  }

  /**
   * Gộp wishlist khách (localStorage) vào tài khoản khi đăng nhập.
   * Bỏ qua id trùng và sản phẩm không tồn tại; không bao giờ ném lỗi vì 1 id xấu.
   */
  async merge(accountId: string, productIds: string[]): Promise<{ productIds: string[] }> {
    const unique = [...new Set(productIds)];
    if (unique.length) {
      const products = await Product.find({ _id: { $in: unique } }).select("_id");
      const validIds = new Set(products.map((p) => p._id.toString()));
      for (const pid of unique) {
        if (!validIds.has(pid)) continue;
        await Wishlist.updateOne(
          { account: accountId, product: pid },
          { $setOnInsert: { account: accountId, product: pid } },
          { upsert: true }
        );
      }
    }
    return { productIds: await this.getProductIds(accountId) };
  }
}
