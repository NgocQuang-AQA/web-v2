# React + TypeScript + Vite

## Hướng dẫn sử dụng AI Chatbot (Báo cáo Test)

- Vị trí sử dụng: Ô `Tìm kiếm` ở thanh trên cùng (`Topbar`).
- Cách dùng: nhập câu hỏi rồi nhấn Enter hoặc bấm nút `Hỏi` để mở modal "Chatbot QA".
- Modal hiển thị cuộc hội thoại; bạn có thể tiếp tục đặt câu hỏi trong modal.
- Các câu hỏi hỗ trợ:
  - "Tỉ lệ testcase pass như nào?"
  - "Có bao nhiêu test thất bại?"
  - "Số lượng flaky tests là bao nhiêu?"
  - "Tổng thời gian chạy là bao lâu?"
  - "Tuần này có cải thiện không so với tuần trước?"

### Cách chạy

- Frontend: `npm run dev` → truy cập `http://localhost:5173` (hoặc cổng thay thế nếu bận).
- Backend: `npm run backend:dev` → API chạy ở `http://localhost:4000`.
- Dữ liệu:
  - Mặc định backend dùng provider `memory` nếu không có Mongo, vẫn đủ cho demo.
  - Để lưu trữ thật, có thể chạy Mongo qua `docker-compose.yml` rồi khởi động backend.

### Kiến trúc & Mở rộng

- Gửi câu hỏi và hiển thị trả lời:
  - UI modal: `src/components/Modal.tsx:10`
  - Modal chatbot: `src/features/chat/ChatBotModal.tsx:13`
  - Kích hoạt từ ô tìm kiếm: `src/app/Topbar.tsx:19`
- Logic Q&A miễn phí (rule-based): `src/features/chat/qa.ts:58`
  - Hàm `answerQuestion(q)` nhận câu hỏi tiếng Việt, nhận diện từ khóa và gọi `fetchStats()`.
  - `fetchStats()` cố gắng gọi `GET /api/reports/stats`, nếu không có dữ liệu thì fallback sang mock.

#### Mở rộng intents (tự viết, không cần AI trả phí)

- Thêm từ khóa và câu trả lời mới ở `src/features/chat/qa.ts:58`.
- Có thể gọi thêm các API sẵn có để lấy số liệu:
  - `GET /api/reports/stats` (thống kê tổng) tại `backend/routes/reports.js:35`
  - `GET /api/reports/suites` (tổng hợp theo suite) tại `backend/routes/reports.js:43`

#### Tích hợp AI miễn phí (tùy chọn, local)

- Nếu muốn trả lời linh hoạt hơn, có thể dùng mô hình nguồn mở chạy cục bộ (ví dụ `Ollama` với `llama3`).
- Cách làm: sửa `src/features/chat/qa.ts`, thay phần trả lời trong `answerQuestion()` bằng gọi REST đến mô hình local rồi hậu xử lý kết quả.
- Ví dụ khung gọi REST (minh họa):

```ts
async function callLocalLLM(prompt: string): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3', prompt })
  })
  if (!res.ok) return ''
  const text = await res.text()
  return text
}
```

- Sau đó, kết hợp với dữ liệu test: gọi `fetchStats()` để lấy số liệu thật rồi chèn vào câu trả lời từ mô hình.
- Lưu ý bảo mật: không ghi khóa bí mật vào mã nguồn; dùng biến môi trường nếu cần.

### API Backend liên quan

- `GET /api/reports/stats`: trả về `successRate`, `failedCount`, `flakyCount`, `totalRuntimeMinutes`.
- `GET /api/reports/suites`: trả về danh sách suite với trạng thái tổng hợp.
- `GET /api/files/:collection`: dùng cho bảng Global QA (ví dụ `global-qa`).

### Mẹo kiểm thử nhanh

- Chạy `npm run lint` để kiểm tra chất lượng mã.
- Chạy `npm run build` để typecheck và build sản phẩm.
- Nếu cần e2e: `npm run e2e` (Playwright, cấu hình tại `tests/playwright.config.js`).

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
