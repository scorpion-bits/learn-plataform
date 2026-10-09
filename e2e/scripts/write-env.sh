#!/usr/bin/env bash
# Gera o arquivo de env dos testes E2E a partir do Supabase local (`supabase start` no ar).
# Uso: bash e2e/scripts/write-env.sh [arquivo]   (padrão: .env.e2e.local; o CI passa `.env`)
set -euo pipefail

out="${1:-.env.e2e.local}"
status="$(mktemp)"
trap 'rm -f "$status"' EXIT

npx supabase status -o env >"$status"
set -a
# shellcheck disable=SC1090
. "$status"
set +a

# CLI nova expõe PUBLISHABLE_KEY/SECRET_KEY; a antiga, ANON_KEY/SERVICE_ROLE_KEY (JWT legadas,
# aceitas pelo app do mesmo jeito).
publishable="${PUBLISHABLE_KEY:-${ANON_KEY:-}}"
secret="${SECRET_KEY:-${SERVICE_ROLE_KEY:-}}"
: "${API_URL:?supabase status não devolveu API_URL (o Supabase local está no ar?)}"
: "${publishable:?sem PUBLISHABLE_KEY/ANON_KEY}"
: "${secret:?sem SECRET_KEY/SERVICE_ROLE_KEY}"

# 127.0.0.1 (e não localhost): tem que bater com o `site_url` do supabase/config.toml, senão o
# link de confirmação de email cai em outro host e o cookie PKCE do cadastro se perde.
cat >"$out" <<ENV
NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
SUPABASE_SECRET_KEY=${secret}
ABACATEPAY_API_KEY=abc_dev_e2e
ABACATEPAY_WEBHOOK_SECRET=e2e-webhook-secret
ABACATEPAY_API_BASE_URL=http://127.0.0.1:4010/v2
E2E_MOCK_PORT=4010
E2E_MAILPIT_URL=http://127.0.0.1:54324
ENV
echo "Env E2E escrita em ${out}"
