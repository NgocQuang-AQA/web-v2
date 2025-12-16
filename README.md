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
