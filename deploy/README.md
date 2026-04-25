# Deploying Siikasää

The whole stack runs as two small Docker containers behind your existing nginx
reverse proxy. There is no host runtime dependency beyond Docker — Node, the
fetch script, and the static file server all live inside the containers.

## Build and run

```sh
# from the repo root
docker compose up --build -d
docker compose logs -f refresh    # watch the first fetch land
```

The `web` container publishes `127.0.0.1:8088` (loopback only, by design) and
the `refresh` container starts by performing one immediate fetch into the
shared `siikasaa-data` volume, then loops on `REFRESH_INTERVAL_HOURS`
(default 4).

Stop and remove:

```sh
docker compose down            # keeps the data volume
docker compose down -v         # also wipes the volume
```

## Reverse-proxy block for your existing nginx

Drop this into a server block on your host (adjust the hostname and SSL bits
to match the rest of your setup):

```nginx
server {
    listen 443 ssl http2;
    server_name siikasaa.example.com;

    # ssl_certificate / ssl_certificate_key as you already do for other domains

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload nginx (`nginx -s reload`) and the site is live.

## Configuration

| Env var                   | Default | Notes                                                                                  |
|---------------------------|--------:|----------------------------------------------------------------------------------------|
| `REFRESH_INTERVAL_HOURS`  |     `4` | How often the refresh container regenerates `data.js`. Accepts fractions (e.g. `0.5`). |
| `SIIKASAA_OUT_DIR`        | `/data` | Where the script writes output. The compose file mounts the named volume here.         |

Set them via your `.env` file or directly in the compose file. To pin the host
port to something other than 8088, edit the `ports:` line in
`docker-compose.yml`.

## Operational notes

- **Data lifecycle.** `siikasaa-data` is a named volume. The web container
  mounts it read-only, so even if the web container is compromised the
  refresh job is safe. The refresh container is the only writer.
- **First boot.** The web container starts before the refresh has finished its
  first run. For ~5–15 seconds the page will 404 on `/data/data.js`. After
  that it self-heals and the page works.
- **Healthcheck.** The web container exposes `/healthz` returning `ok`. Wire
  it to your monitoring if you want.
- **Refresh failures** are logged but non-fatal — the container keeps running
  with the previous successful snapshot. Check `docker compose logs refresh`
  if the timestamp on the page stops advancing.
- **Manual refresh.** `docker compose exec refresh node /app/scripts/refresh.mjs`
  triggers an out-of-band fetch.

## Local development without Docker

```sh
npm run refresh        # writes a fresh src/data/data.js
npm start              # python3 -m http.server 8000 --directory src
# open http://localhost:8000/
```

`npm run refresh:dry` writes to `/tmp/siikasaa-dryrun/` instead of touching
the repo, so you can sanity-check the upstream APIs without overwriting the
committed data file.
