#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

info() { printf '\n\033[1;34m[CRISPR]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warning]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "Docker is required. See docs/deployment/setup.md."
command -v curl >/dev/null 2>&1 || fail "curl is required."
command -v python3 >/dev/null 2>&1 || fail "python3 is required for secure key generation."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 ('docker compose') is required."

if docker info >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
  COMPOSE=(sudo docker compose)
else
  fail "Cannot access Docker. Add your user to the docker group or run with sudo privileges."
fi

cd "$ROOT_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  info "Created .env from .env.example"
else
  chmod 600 "$ENV_FILE"
  info "Existing .env found. Empty input preserves its current value."
fi

get_env() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1
}

set_env() {
  local key="$1" value="$2" tmp line found=0
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* ]] || fail "$key cannot contain a newline"
  tmp="$(mktemp "$ROOT_DIR/.env.tmp.XXXXXX")"
  chmod 600 "$tmp"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == "$key="* ]]; then
      if [[ $found -eq 0 ]]; then
        printf '%s=%s\n' "$key" "$value" >> "$tmp"
        found=1
      fi
    else
      printf '%s\n' "$line" >> "$tmp"
    fi
  done < "$ENV_FILE"
  if [[ $found -eq 0 ]]; then printf '%s=%s\n' "$key" "$value" >> "$tmp"; fi
  mv "$tmp" "$ENV_FILE"
}

prompt_value() {
  local key="$1" label="$2" default_value="${3:-}" required="${4:-false}"
  local current answer
  current="$(get_env "$key")"
  while true; do
    if [[ -n "$current" ]]; then
      read -r -p "$label [Enter=keep current, skip=clear]: " answer
      [[ -z "$answer" ]] && return
    else
      read -r -p "$label${default_value:+ [$default_value]} [skip=leave empty]: " answer
      [[ -z "$answer" ]] && answer="$default_value"
    fi
    [[ "$answer" == "skip" ]] && answer=""
    if [[ "$required" == true && -z "$answer" ]]; then
      warn "$label is required."
      continue
    fi
    set_env "$key" "$answer"
    return
  done
}

prompt_secret() {
  local key="$1" label="$2" required="${3:-false}" generator="${4:-}"
  local current answer
  current="$(get_env "$key")"
  while true; do
    if [[ -n "$current" ]]; then
      read -r -s -p "$label [Enter=keep, type replace, skip=clear]: " answer; printf '\n'
      [[ -z "$answer" ]] && return
      if [[ "$answer" == "replace" ]]; then
        read -r -s -p "New $label: " answer; printf '\n'
      fi
    elif [[ -n "$generator" ]]; then
      read -r -s -p "$label [Enter=generate securely, or enter value]: " answer; printf '\n'
      [[ -z "$answer" ]] && answer="$($generator)"
    else
      read -r -s -p "$label [skip=leave empty]: " answer; printf '\n'
    fi
    [[ "$answer" == "skip" ]] && answer=""
    if [[ "$required" == true && -z "$answer" ]]; then
      warn "$label is required."
      continue
    fi
    set_env "$key" "$answer"
    return
  done
}

generate_auth_secret() {
  python3 -c 'import secrets; print(secrets.token_hex(32))'
}

generate_fernet_key() {
  python3 -c 'import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'
}

yes_no() {
  local prompt="$1" default="${2:-n}" answer
  read -r -p "$prompt [y/n, default=$default]: " answer
  answer="${answer:-$default}"
  [[ "$answer" =~ ^[Yy]$ ]]
}

info "Core database configuration"
prompt_value POSTGRES_DB "PostgreSQL database" "crispr" true
prompt_value POSTGRES_USER "PostgreSQL username" "crispr_app" true
prompt_secret POSTGRES_PASSWORD "PostgreSQL password" true
prompt_value DB_CONNECT_TIMEOUT_SECONDS "Database connection timeout seconds" "3" true

info "Authentication and administrator"
prompt_secret AUTH_SECRET "JWT signing secret" true generate_auth_secret
prompt_value SECURITY_ADMIN_EMAIL "Security administrator email" "security-admin@example.com" true
prompt_secret SECURITY_ADMIN_PASSWORD "Security administrator password (minimum 12 characters)" true
admin_password="$(get_env SECURITY_ADMIN_PASSWORD)"
[[ ${#admin_password} -ge 12 ]] || fail "SECURITY_ADMIN_PASSWORD must contain at least 12 characters."
prompt_value ACCESS_TOKEN_LIFETIME_MINUTES "Access-token lifetime minutes" "30" true
prompt_value ALLOW_PUBLIC_REPORTER_REGISTRATION "Allow public reporter registration (true/false)" "false" true
prompt_secret INTEGRATION_ENCRYPTION_KEY "Integration credential encryption key" true generate_fernet_key

info "Runtime mode"
prompt_value CRISPR_DATA_MODE "Data mode (live/demo)" "live" true
data_mode="$(get_env CRISPR_DATA_MODE)"
[[ "$data_mode" == "live" || "$data_mode" == "demo" ]] || fail "CRISPR_DATA_MODE must be live or demo."
prompt_value DEMO_AUTO_SEED "Automatically seed demo fixtures (true/false)" "false" true
prompt_value CORS_ORIGINS "Allowed browser origins (comma separated)" "http://127.0.0.1:5173,http://localhost:5173" true
prompt_value API_DOCS_ENABLED "Expose API documentation (true/false)" "false" true

info "NVD/NIST integration (optional; type skip to leave blank)"
prompt_secret NVD_API_KEY "NVD API key" false
prompt_value NVD_USER_AGENT "NVD user agent with contact" "CRISPR-risk-platform/1.0 security-admin@example.com"
prompt_value NVD_REQUEST_INTERVAL_SECONDS "NVD request interval seconds (blank selects safe automatic value)" ""

info "AI Risk Advisor (optional)"
prompt_value LLM_ENABLED "Enable OpenAI-compatible LLM (true/false)" "false" true
if [[ "$(get_env LLM_ENABLED)" == "true" ]]; then
  prompt_value LLM_BASE_URL "LLM API base URL" "" true
  prompt_secret LLM_API_KEY "LLM API key" true
else
  set_env LLM_BASE_URL "$(get_env LLM_BASE_URL)"
  set_env LLM_API_KEY "$(get_env LLM_API_KEY)"
fi

info "Configuration written to .env (secrets are not displayed)."
"${COMPOSE[@]}" config >/dev/null || fail "docker-compose configuration validation failed."

if [[ -n "$("${COMPOSE[@]}" ps --quiet --status running db 2>/dev/null)" ]]; then
  if yes_no "Create a PostgreSQL backup before deployment?" y; then
    backup="$ROOT_DIR/crispr-backup-$(date +%Y%m%d-%H%M%S).dump"
    partial="${backup}.partial"
    info "Creating database backup (up to 10 minutes)..."
    if timeout 600 "${COMPOSE[@]}" exec -T db sh -lc \
      'exec pg_dump --no-password --format=custom -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$partial" \
      && [[ -s "$partial" ]]; then
      mv "$partial" "$backup"
      chmod 600 "$backup"
      info "Backup saved: $backup"
    else
      warn "Backup failed or was empty; deployment has not started."
      warn "Partial file, if present: $partial"
      exit 1
    fi
  fi
fi

if yes_no "Build and start CRISPR now?" y; then
  info "Building containers"
  "${COMPOSE[@]}" build backend worker frontend bug-bounty
  info "Starting database, backend, worker, and web applications"
  "${COMPOSE[@]}" up -d --force-recreate db backend worker frontend bug-bounty

  info "Waiting for readiness"
  ready=false
  for _ in $(seq 1 60); do
    if curl -fsS http://127.0.0.1:5173/api/health/ready >/dev/null 2>&1; then ready=true; break; fi
    sleep 2
  done
  [[ "$ready" == true ]] || { "${COMPOSE[@]}" logs --tail=100 backend worker; fail "CRISPR did not become ready within 120 seconds."; }
  curl -fsS http://127.0.0.1:5173/api/health/ready
  printf '\n'
  "${COMPOSE[@]}" exec -T backend alembic current
fi

if curl -fsS http://127.0.0.1:5173/api/health/ready >/dev/null 2>&1 \
  && yes_no "Configure and verify a GitHub integration now?" n; then
  command -v jq >/dev/null 2>&1 || fail "jq is required for interactive GitHub configuration."
  read -r -p "Integration display name [GitHub]: " github_name
  github_name="${github_name:-GitHub}"
  read -r -p "GitHub organization [Enter=authenticated user's repositories]: " github_org
  read -r -s -p "GitHub token: " github_token; printf '\n'
  [[ -n "$github_token" ]] || fail "GitHub token cannot be empty when GitHub setup is selected."
  admin_email="$(get_env SECURITY_ADMIN_EMAIL)"
  login_payload="$(printf '%s\n%s\n' "$admin_email" "$admin_password" | python3 -c \
    'import json,sys; email,password=sys.stdin.read().splitlines(); print(json.dumps({"email":email,"password":password}))')"
  login_json="$(curl -fsS -X POST http://127.0.0.1:5173/api/auth/login \
    -H 'Content-Type: application/json' --data "$login_payload")"
  token="$(printf '%s' "$login_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"
  payload="$(printf '%s\n%s\n%s\n' "$github_name" "$github_token" "$github_org" | python3 -c \
    'import json,sys; data=sys.stdin.read(); data=data[:-1] if data.endswith("\n") else data; name,token,org=data.split("\n",2); print(json.dumps({"provider":"github","name":name,"token":token,"organization":org or None,"sync_interval_minutes":60}))')"
  response="$(curl -fsS -X POST http://127.0.0.1:5173/api/integrations \
    -H "Authorization: Bearer $token" -H 'Content-Type: application/json' --data "$payload")"
  printf '%s\n' "$response" | jq .
  unset github_token payload admin_password token login_json login_payload
fi

info "Installation workflow completed. Open http://SERVER_IP:5173"
info "See docs/deployment/setup.md for live-data ingestion and verification."
