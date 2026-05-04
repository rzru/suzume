use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct HealthState {
    http_client: Client,
    ollama_base_url: String,
    anki_connect_url: String,
}

#[derive(Serialize, Deserialize)]
struct StatusResponse {
    ollama_connected: bool,
    anki_connected: bool,
}

#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
}

#[derive(Serialize)]
struct AnkiVersionRequest<'a> {
    action: &'a str,
    version: u8,
}

#[derive(Deserialize)]
struct AnkiVersionResponse {
    error: Option<String>,
}

impl HealthState {
    pub fn new(
        http_client: Client,
        ollama_base_url: String,
        anki_connect_url: String,
    ) -> Self {
        Self {
            http_client,
            ollama_base_url,
            anki_connect_url,
        }
    }
}

pub fn router(state: HealthState) -> Router {
    Router::new()
        .route("/health", get(get_health))
        .route("/status", get(get_status))
        .with_state(state)
}

async fn get_health() -> impl IntoResponse {
    (StatusCode::OK, Json(HealthResponse { ok: true }))
}

async fn get_status(State(state): State<HealthState>) -> impl IntoResponse {
    let (ollama_connected, anki_connected) = tokio::join!(
        check_ollama(&state.http_client, &state.ollama_base_url),
        check_anki(&state.http_client, &state.anki_connect_url)
    );
    Json(StatusResponse {
        ollama_connected,
        anki_connected,
    })
}

async fn check_ollama(client: &Client, base_url: &str) -> bool {
    let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
    match client.get(url).send().await {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

async fn check_anki(client: &Client, endpoint: &str) -> bool {
    let request = AnkiVersionRequest {
        action: "version",
        version: 6,
    };

    match client.post(endpoint).json(&request).send().await {
        Ok(response) => {
            if !response.status().is_success() {
                return false;
            }
            match response.json::<AnkiVersionResponse>().await {
                Ok(body) => body.error.is_none(),
                Err(_) => false,
            }
        }
        Err(_) => false,
    }
}

