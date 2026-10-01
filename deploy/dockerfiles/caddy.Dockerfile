# Optional: Caddy with the Cloudflare DNS module for a wildcard *.rireki.app certificate
# (instead of on-demand TLS). Set CF_API_TOKEN and use `tls { dns cloudflare {$CF_API_TOKEN} }`.
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
