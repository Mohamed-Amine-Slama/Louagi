# Docker

This setup runs the project as two containers:

- `api`: the Express backend in `server/`, exposed on `http://localhost:3000`
- `app`: the Expo dev server, exposed on `http://localhost:8081`

Supabase/Postgres stays external and is read from `server/.env`.

## Run

```powershell
docker compose up --build
```

The Expo QR code is printed by the `app` service. If the terminal is busy with
other logs, follow just the frontend container:

```powershell
docker compose logs -f app
```

Stop it with:

```powershell
docker compose down
```

## Environment

The backend uses:

```text
server/.env
```

Make sure it includes `APP_JWT_SECRET`. For local development it can reuse the
same value as `SUPABASE_JWT_SECRET`, but it must be stable across restarts.

The Expo app uses:

```text
.env
```

For a physical phone, keep `EXPO_PUBLIC_API_URL` set to a URL the phone can reach, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.21:3000
EXPO_HOST_IP=192.168.0.21
```

Do not set it to `http://api:3000` unless the JavaScript is running inside another container; phones and browsers outside Docker cannot resolve Compose service names.

`EXPO_HOST_IP` tells Expo which host/IP to put in the QR code when Metro runs inside Docker.

## Useful Checks

Backend health:

```powershell
curl http://localhost:3000/health
```

Container logs:

```powershell
docker compose logs -f api
docker compose logs -f app
```
