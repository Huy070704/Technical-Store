const fs = require('fs');
const path = require('path');

function updateFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const r of replacements) {
        content = content.replace(r.regex, r.replacement);
    }
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
}

// 1. types
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/admin/types/admin.ts', [
    { regex: / *stock: number;\n/g, replacement: '' }
]);

// 2. adminData
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/admin/data/adminData.ts', [
    { regex: / *stock: \d+,\n/g, replacement: '' },
    { regex: / *status: 'Low Stock',\n/g, replacement: "    status: 'Active',\n" },
    { regex: / *status: 'Out of Stock',\n/g, replacement: "    status: 'Archived',\n" },
    { regex: / *label: 'Low Stock Items',\n/g, replacement: "    label: 'Archived Items',\n" },
    { regex: / *label: 'Out of Stock',\n/g, replacement: "    label: 'Inactive',\n" }
]);

// 3. ProductDetailModal
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/admin/products/ProductDetailModal.tsx', [
    { regex: / *<div className="text-body-md text-on-surface">{product\.stock} sản phẩm<\/div>\n/g, replacement: '' },
    { regex: / *<div className="text-label-sm text-tertiary uppercase tracking-wider mb-1">Tồn kho<\/div>\n/g, replacement: '' }
]);

// 4. ProductFilters
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/admin/products/ProductFilters.tsx', [
    { regex: / *<option value="Low Stock">Sắp hết hàng<\/option>\n/g, replacement: '' },
    { regex: / *<option value="Out of Stock">Hết hàng<\/option>\n/g, replacement: '' }
]);

// 5. ProductFormModal
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/admin/products/ProductFormModal.tsx', [
    { regex: / *stock: string;\n/g, replacement: '' },
    { regex: / *stock: '0',\n/g, replacement: '' },
    { regex: / *stock: String\(product\.stock\),\n/g, replacement: '' },
    { regex: / *stock: Number\(form\.stock\),\n/g, replacement: '' },
    { regex: / *<div>\s*<label className="block text-label-md font-medium text-on-surface mb-1">Tồn kho<\/label>\s*<input\s*type="number"\s*className="w-full h-10 px-3 rounded-lg border border-outline bg-surface text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"\s*value=\{form\.stock\}\s*onChange=\{\(event\) => updateForm\('stock', event\.target\.value\)\}\s*\/>\s*<\/div>/g, replacement: '' }
]);

// 6. ProductStatusBadge
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/admin/products/ProductStatusBadge.tsx', [
    { regex: / *'Low Stock': 'bg-error-container text-on-error-container',\n/g, replacement: '' },
    { regex: / *'Out of Stock': 'bg-secondary-fixed text-on-secondary-fixed-variant',\n/g, replacement: '' },
    { regex: / *'Low Stock': 'bg-error',\n/g, replacement: '' },
    { regex: / *'Out of Stock': 'bg-secondary',\n/g, replacement: '' },
    { regex: / *'Low Stock': 'Sắp hết hàng',\n/g, replacement: '' },
    { regex: / *'Out of Stock': 'Hết hàng',\n/g, replacement: '' }
]);

// 7. ProductTable
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/admin/products/ProductTable.tsx', [
    { regex: /const getStockPercent = \(stock: number\) => Math\.max\(0, Math\.min\(100, Math\.round\(\(stock \/ 340\) \* 100\)\)\);\n/g, replacement: '' },
    { regex: /const getStockColor = \(stock: number\) => \{\n *if \(stock === 0\) return 'bg-secondary';\n *if \(stock < 20\) return 'bg-error';\n *return 'bg-primary';\n};\n/g, replacement: '' },
    { regex: / *<th className="h-12 px-4 text-left align-middle font-medium text-tertiary">Kho<\/th>\n/g, replacement: '' },
    { regex: / *<td className="p-4 align-middle">\n *<div className="flex flex-col gap-2">\n *<div className=\{`text-label-md \$\{product\.stock < 20 && product\.stock > 0 \? 'text-error' : 'text-on-surface'\}`\}>\n *\{product\.stock\}\n *<\/div>\n *<div className="w-full h-1\.5 bg-surface-variant rounded-full overflow-hidden">\n *<div className=\{`h-full \$\{getStockColor\(product\.stock\)\}`\} style=\{\{ width: `\$\{getStockPercent\(product\.stock\)\}%` \}\} \/>\n *<\/div>\n *<\/div>\n *<\/td>\n/g, replacement: '' }
]);

// 8. admin (type) ProductStatus
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/admin/types/admin.ts', [
    { regex: / \| 'Low Stock' \| 'Out of Stock'/g, replacement: '' },
    { regex: / *stock\?: number;\n/g, replacement: '' },
    { regex: / *stock: number;\n/g, replacement: '' }
]);

// 9. CartItemRow
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/cart/CartItemRow.tsx', [
    { regex: /const atMax = qty >= item\.product\.stock;\n/g, replacement: 'const atMax = false;\n' },
    { regex: / *<span className=\{cart\.cartProductStockBadge\}>\n *\{item\.product\.stock\} sp\n *<\/span>\n/g, replacement: '' }
]);

// 10. BrowseProductCard
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/product/BrowseProductCard.tsx', [
    { regex: / *const stock =[\s\S]*?product\.stock \!= null && product\.stock \!== undefined[\s\S]*?\? Number\(product\.stock\)[\s\S]*?: null;\n/g, replacement: '' },
    { regex: / *const inStock = stock === null \? true : stock > 0;\n/g, replacement: '  const inStock = true;\n' },
    { regex: / *const maxQty = stock \?\? 99;\n/g, replacement: '  const maxQty = 99;\n' },
    { regex: / *const atMax = stock \!== null && quantity >= stock;\n/g, replacement: '  const atMax = false;\n' },
    { regex: / *\{stock \!== null && inStock && \(\n *<div className="flex items-center gap-1\.5">\n *<div className="w-1\.5 h-1\.5 rounded-full bg-success" \/>\n *<span className="shrink-0 text-tertiary">Còn \{stock\}<\/span>\n *<\/div>\n *\)\}\n/g, replacement: '' }
]);

// 11. ProductSpecDetails
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/product/ProductSpecDetails.tsx', [
    { regex: / *"stock",\n/g, replacement: '' }
]);

// 12. WishlistItemRow
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/components/wishlist/WishlistItemRow.tsx', [
    { regex: / *const inStock = product\.stock > 0;\n/g, replacement: '  const inStock = true;\n' },
    { regex: / *\{!inStock && \(\n *<span className="inline-flex items-center px-2 py-0\.5 rounded-full bg-error-container text-on-error-container text-label-sm font-medium">\n *Hết hàng\n *<\/span>\n *\)\}\n/g, replacement: '' },
    { regex: /disabled=\{!inStock\}/g, replacement: '' }
]);

// 13. CartContext
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/contexts/CartContext.tsx', [
    { regex: / *if \(item\.product\.stock && currentQty \+ amount > item\.product\.stock\) \{\n *toast\.error\(`Chỉ còn \$\{item\.product\.stock\} sản phẩm trong kho`\);\n *return;\n *\}/g, replacement: '' },
    { regex: / *if \(product\.stock && quantity > product\.stock\) \{\n *toast\.error\(`Chỉ còn \$\{product\.stock\} sản phẩm trong kho`\);\n *return;\n *\}/g, replacement: '' }
]);

// 14. ProductDetailPage
updateFile('D:/ki 8/WDP301/Technical-Store/Technical-Store/frontend/src/pages/ProductDetailPage.tsx', [
    { regex: / *const stock =[\s\S]*?product\.stock \!= null && product\.stock \!== undefined[\s\S]*?\? Number\(product\.stock\)[\s\S]*?: null;\n/g, replacement: '' },
    { regex: / *const inStock = stock === null \? true : stock > 0;\n/g, replacement: '  const inStock = true;\n' },
    { regex: / *const maxQty = stock \?\? 99;\n/g, replacement: '  const maxQty = 99;\n' },
    { regex: / *const atMax = stock \!== null && quantity >= stock;\n/g, replacement: '  const atMax = false;\n' },
    { regex: / *\{stock \!== null && \(\n *<div className="flex items-center gap-2">\n *<div\n *className=\{`w-2 h-2 rounded-full \$\{inStock \? "bg-success" : "bg-error"\}`\}\n *\/>\n *<span className="text-body-md text-tertiary">\n *\{inStock \? `Còn \$\{stock\} sản phẩm` : "Tạm hết hàng"\}\n *<\/span>\n *<\/div>\n *\)\}\n/g, replacement: '' }
]);
