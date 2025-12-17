## 0) Cài đặt lần đầu

- Yêu cầu: Docker Desktop (hoặc Docker Engine), Node.js 18+ và npm.
- Cài dependencies:

```bash
npm ci
npm --prefix backend ci
```

- Kiểm tra nhanh:

```bash
npm run lint && npm run build
```

## 1) Chạy trên máy local

- Khởi động Backend:

```bash
npm run backend:dev
```

- Khởi động Frontend (trỏ API về backend local):

```bash
VITE_API_URL=http://localhost:4000 npm run dev
```

- Truy cập: Frontend `http://localhost:5173`, Backend health `http://localhost:4000/health`.

## 2) Đưa lên server (Windows + WSL, domain/IP 10.13.60.136)

- Yêu cầu: Windows có Docker Desktop, bật WSL integration; share ổ D cho Docker.
- Thư mục báo cáo trên host: ` /mnt/d/Project/global-cn/report_history` và ` /mnt/d/Project/global-qa/report_history`.
- Backend health check: `http://10.13.60.136:4000/health`
- Build FE trỏ tới backend qua domain/IP và chạy stack:

```bash
docker compose build --build-arg VITE_API_URL=http://10.13.60.136:4000 frontend && docker compose up -d
```

- Truy cập: Frontend `http://10.13.60.136:5173`, Backend health `http://10.13.60.136:4000/health`.
- Dừng dịch vụ: `docker compose down`.

### FE chạy domain khác, gọi API qua domain backend

- Nếu bạn deploy FE ở domain/IP khác backend (không dùng Nginx proxy `/api/`), hãy build FE với:
  - `VITE_API_URL=http://10.13.60.136:4000`
- Sau đó FE sẽ gọi API dạng:
  - `http://10.13.60.136:4000/api/...`

## 3) Chạy trực tiếp trên Windows 11 (không Docker)

- Yêu cầu:
  - Cài đặt Node.js 18+ và npm.
  - Tùy chọn: MongoDB chạy local (nếu dùng `DATA_PROVIDER=mongo`).
  - Mở firewall cho `TCP 4000` (backend) và `TCP 5173` (frontend dev/preview) nếu cần truy cập từ máy khác.

- Cài dependencies:

```bash
npm ci
npm --prefix backend ci
```

- Cấu hình Backend:
  - Sẵn có `backend/.env.windows` (Windows sẽ tự nạp file này) ví dụ:
    - `DATA_PROVIDER=mongo`
    - `MONGO_URI=mongodb://localhost:27017`
    - `MONGO_DB_NAME=mydb`
    - `PORT=4000`
    - `FILES_DEBUG=1`
    - `SERENITY_HISTORY_DIR=D://Project//global-qa//report_history`
    - `SERENITY_HISTORY_DIR_CN=D://Project//global-cn//report_history`
  - Backend tự động nạp `.env.windows` trên Windows. Nếu muốn, có thể đổi tên `backend/.env.windows` thành `backend/.env`.

- Khởi động Backend:

```bash
npm run backend:start
```

- Kiểm tra:
  - Health: `http://localhost:4000/health`
  - Từ máy khác trong LAN: `http://10.13.60.136:4000/health`

- Khởi động Frontend (dev):
  - FE gọi API qua domain backend (để truy cập từ máy khác/domain khác): set `VITE_API_URL=http://10.13.60.136:4000`
  - PowerShell:

```powershell
$env:VITE_API_URL='http://10.13.60.136:4000'; npm run dev
```

  - CMD:

```cmd
set VITE_API_URL=http://10.13.60.136:4000 && npm run dev
```

- Truy cập:
  - Trên server: Frontend `http://localhost:5173`
  - Từ máy khác: Frontend `http://10.13.60.136:5173`

- Build và preview FE trỏ về backend qua domain:

```bash
VITE_API_URL=http://10.13.60.136:4000 npm run build && npm run preview -- --host 0.0.0.0 --port 5173
```
