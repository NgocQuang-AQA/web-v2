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
- Build FE trỏ tới backend qua domain/IP và chạy stack:

```bash
docker compose build --build-arg VITE_API_URL=http://10.13.60.136:4000 frontend && docker compose up -d
```

- Truy cập: Frontend `http://10.13.60.136:5173`, Backend health `http://10.13.60.136:4000/health`.
- Dừng dịch vụ: `docker compose down`.

## 3) Chạy trực tiếp trên Windows 11 (không Docker)

- Yêu cầu:
  - Cài đặt Node.js 18+ và npm.
  - Tùy chọn: MongoDB chạy local (nếu muốn `DATA_PROVIDER=mongo`).
  - Mở firewall cho `TCP 4000` nếu cần truy cập từ máy khác.

- Cài dependencies:

```bash
npm ci
npm --prefix backend ci
```

- Cấu hình Backend:
  - Sẵn có `backend/.env.windows` với cấu hình mặc định:
    - `DATA_PROVIDER=memory`
    - `PORT=4000`
    - `FILES_DEBUG=1`
    - `SERENITY_HISTORY_DIR=D://Project//global-qa//report_history`
    - `SERENITY_HISTORY_DIR_CN=D://Project//global-cn//report_history`
  - Backend tự động nạp `.env.windows` trên Windows. Nếu muốn, có thể đổi tên `backend/.env.windows` thành `backend/.env`.
  - Dùng Mongo local: bật
    - `DATA_PROVIDER=mongo`
    - `MONGO_URI=mongodb://localhost:27017/webv2`
    - `MONGO_DB_NAME=mydb`

- Khởi động Backend:

```bash
npm run backend:start
```

- Kiểm tra:
  - Health: `http://localhost:4000/health`

- Khởi động Frontend (dev):
  - PowerShell:

```powershell
$env:VITE_API_URL='http://localhost:4000'; npm run dev
```

  - CMD:

```cmd
set VITE_API_URL=http://localhost:4000 && npm run dev
```

- Truy cập: Frontend `http://localhost:5173`, Backend `http://localhost:4000`.

- Build và preview FE trỏ về backend Windows:

```bash
VITE_API_URL=http://localhost:4000 npm run build && npm run preview
```
