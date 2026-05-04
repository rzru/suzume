mod health;

use std::{
    net::{IpAddr, SocketAddr},
    str::FromStr,
    time::Duration,
};

use axum::{
    http::{HeaderName, HeaderValue, Method},
    Router,
};
use reqwest::Client;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    trace::TraceLayer,
};
use tracing::{error, info};
use tracing_subscriber::{fmt, EnvFilter};

const DEFAULT_SERVER_HOST: &str = "0.0.0.0";
const DEFAULT_SERVER_PORT: u16 = 18080;
const DEFAULT_OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434";
const DEFAULT_ANKI_CONNECT_URL: &str = "http://127.0.0.1:8765";
const DEFAULT_ALLOWED_ORIGINS: &str = "http://localhost:5173,http://127.0.0.1:5173";
const DEFAULT_CHECK_TIMEOUT_MS: u64 = 2_000;
const X_REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");

#[tokio::main]
async fn main() {
    init_tracing();

    let check_timeout = read_u64_env("SUZUME_HEALTH_TIMEOUT_MS").unwrap_or(DEFAULT_CHECK_TIMEOUT_MS);
    let http_client = Client::builder()
        .timeout(Duration::from_millis(check_timeout))
        .build()
        .expect("failed to create HTTP client");

    let health_state = health::HealthState::new(
        http_client,
        read_string_env("OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE_URL),
        read_string_env("ANKI_CONNECT_URL", DEFAULT_ANKI_CONNECT_URL),
    );

    let cors = build_cors_layer();
    let app = Router::new()
        .merge(health::router(health_state))
        .layer(PropagateRequestIdLayer::new(X_REQUEST_ID))
        .layer(SetRequestIdLayer::new(X_REQUEST_ID, MakeRequestUuid))
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    let bind_ip = read_ip_env("SUZUME_SERVER_HOST", DEFAULT_SERVER_HOST);
    let bind_port = read_u16_env("SUZUME_SERVER_PORT").unwrap_or(DEFAULT_SERVER_PORT);
    let bind_address = SocketAddr::from((bind_ip, bind_port));

    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("failed to bind server listener");
    info!("suzume-server listening on {}", bind_address);

    if let Err(err) = axum::serve(listener, app).await {
        error!("server failed: {err}");
    }
}

fn build_cors_layer() -> CorsLayer {
    let allowed_origins_raw = read_string_env("SUZUME_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS);
    let mut origins = Vec::new();
    for origin in allowed_origins_raw.split(',') {
        let trimmed = origin.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(value) = HeaderValue::from_str(trimmed) {
            origins.push(value);
        }
    }

    let allow_origin = if origins.is_empty() {
        AllowOrigin::any()
    } else {
        AllowOrigin::list(origins)
    };

    CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_methods([Method::GET])
}

fn init_tracing() {
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info,tower_http=info"));
    fmt().json().with_env_filter(filter).init();
}

fn read_string_env(key: &str, default_value: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default_value.to_owned())
}

fn read_ip_env(key: &str, default_value: &str) -> IpAddr {
    std::env::var(key)
        .ok()
        .and_then(|value| IpAddr::from_str(&value).ok())
        .unwrap_or_else(|| IpAddr::from_str(default_value).expect("invalid default IP address"))
}

fn read_u16_env(key: &str) -> Option<u16> {
    std::env::var(key).ok().and_then(|value| value.parse::<u16>().ok())
}

fn read_u64_env(key: &str) -> Option<u64> {
    std::env::var(key).ok().and_then(|value| value.parse::<u64>().ok())
}
