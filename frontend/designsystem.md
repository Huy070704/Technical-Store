# Retail Operations Pro

Design system cho **toàn bộ app store** (Home, Cart, Admin, sản phẩm, …).

**Ngoại lệ:** trang đăng nhập / đăng ký / quên mật khẩu dùng `src/styles/authFormClasses.ts`.

## Trong code

| Layer | File | Vai trò |
|-------|------|---------|
| Tokens (màu, font, spacing) | `tailwind.config.js` | Nguồn màu & typography |
| Base CSS | `src/styles/globals.css` | Reset, `body` |
| Components | `src/styles/designSystem.ts` → `ds` | Button, card, input, badge, … |
| Feature | `src/styles/cartClasses.ts` | Layout riêng Cart (compose từ `ds`) |

```tsx
import { ds } from '@/styles/designSystem';

<button className={ds.btn.primary}>Lưu</button>
<div className={`${ds.card.base} ${ds.card.paddingLg}`}>...</div>
```

## Màu chính

- **Primary:** `#b70011` — CTA, brand
- **Nền:** `bg-base` `#F1F3F7`, card `bg-card` `#FFFFFF`
- **Chữ:** `on-surface` `#0b1c30`, phụ `secondary` / `muted` `#545f73`
- **Nav admin:** `inverse-surface` / `slate-dark` `#213145`

## Typography (Inter)

| Token | Size / weight |
|-------|----------------|
| `text-headline-xl` | 28px / 700 |
| `text-headline-lg` | 20px / 600 |
| `text-body-md` | 16px / 400 |
| `text-body-sm` | 14px / 400 |
| `text-label-md` | 14px / 600 |
| `text-label-xs` | 12px / 500 |

## Spacing (8pt)

`xs` 4 · `sm` 8 · `md` 16 · `lg` 24 · `xl` 32

## Bo góc

`rounded-sm` 8px (nút) · `rounded-md` 12px (card) · `rounded-display` 18px (banner) · `rounded-full` (badge)

## Shadow

`shadow-card` · `shadow-elevated` · `shadow-primary-glow`
