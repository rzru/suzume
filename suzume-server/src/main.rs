mod anki;
mod health;
mod models;
mod practice;
mod state;

use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    time::Duration,
};

use axum::{
    Router,
    http::{HeaderName, HeaderValue, Method},
};
use reqwest::Client;
use serde::Deserialize;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    trace::TraceLayer,
};
use tracing::{error, info};
use tracing_subscriber::{EnvFilter, fmt};

use crate::state::AppState;

const X_REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");

#[derive(Deserialize)]
#[serde(default)]
struct Config {
    suzume_server_host: IpAddr,
    suzume_server_port: u16,
    suzume_health_timeout_ms: u64,
    suzume_anki_timeout_ms: u64,
    suzume_allowed_origins: Vec<String>,
    ollama_base_url: String,
    ollama_model: String,
    anki_connect_url: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            suzume_server_host: IpAddr::V4(Ipv4Addr::UNSPECIFIED),
            suzume_server_port: 18080,
            suzume_health_timeout_ms: 2_000,
            suzume_anki_timeout_ms: 30_000,
            suzume_allowed_origins: vec![
                "http://localhost:5173".into(),
                "http://127.0.0.1:5173".into(),
            ],
            ollama_base_url: "http://127.0.0.1:11434".into(),
            ollama_model: "qwen3".into(),
            anki_connect_url: "http://127.0.0.1:8765".into(),
        }
    }
}

#[tokio::main]
async fn main() {
    init_tracing();

    let cfg: Config = envy::from_env().expect("invalid env config");

    let http_client = Client::builder()
        .timeout(Duration::from_millis(cfg.suzume_health_timeout_ms))
        .build()
        .expect("failed to create HTTP client");

    let anki_http_client = Client::builder()
        .timeout(Duration::from_millis(cfg.suzume_anki_timeout_ms))
        .pool_max_idle_per_host(0)
        .build()
        .expect("failed to create Anki HTTP client");

    let state = AppState {
        http_client,
        anki_http_client,
        ollama_base_url: cfg.ollama_base_url,
        ollama_model: cfg.ollama_model,
        anki_connect_url: cfg.anki_connect_url,
    };

    let app = Router::new()
        .merge(health::router())
        .merge(anki::decks::router())
        .merge(anki::media::router())
        .merge(models::router())
        .merge(practice::router())
        .with_state(state)
        .layer(PropagateRequestIdLayer::new(X_REQUEST_ID))
        .layer(SetRequestIdLayer::new(X_REQUEST_ID, MakeRequestUuid))
        .layer(TraceLayer::new_for_http())
        .layer(build_cors_layer(&cfg.suzume_allowed_origins));

    let bind_address = SocketAddr::from((cfg.suzume_server_host, cfg.suzume_server_port));
    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("failed to bind server listener");
    info!("suzume-server listening on {}", bind_address);

    if let Err(err) = axum::serve(listener, app).await {
        error!("server failed: {err}");
    }
}

fn build_cors_layer(allowed_origins: &[String]) -> CorsLayer {
    let trimmed: Vec<&str> = allowed_origins
        .iter()
        .map(|origin| origin.trim())
        .filter(|origin| !origin.is_empty())
        .collect();

    let allow_any = trimmed.is_empty() || trimmed.iter().any(|origin| *origin == "*");

    let allow_origin = if allow_any {
        AllowOrigin::any()
    } else {
        let origins: Vec<HeaderValue> = trimmed
            .iter()
            .filter_map(|origin| HeaderValue::from_str(origin).ok())
            .collect();
        AllowOrigin::list(origins)
    };

    CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_methods([Method::GET])
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,tower_http=info"));
    fmt().json().with_env_filter(filter).init();
}
