use anki_bridge::prelude::*;
use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::get};
use ollama_rs::Ollama;
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
}

#[derive(Serialize)]
struct StatusResponse {
    ollama_connected: bool,
    anki_connected: bool,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(get_health))
        .route("/status", get(get_status))
}

async fn get_health() -> impl IntoResponse {
    (StatusCode::OK, Json(HealthResponse { ok: true }))
}

async fn get_status(State(state): State<AppState>) -> impl IntoResponse {
    let (ollama_connected, anki_connected) = tokio::join!(
        check_ollama(&state.ollama_base_url),
        check_anki(&state.http_client, &state.anki_connect_url),
    );
    Json(StatusResponse {
        ollama_connected,
        anki_connected,
    })
}

async fn check_ollama(url: &str) -> bool {
    match Ollama::try_new(url) {
        Ok(ollama) => ollama.list_local_models().await.is_ok(),
        Err(_) => false,
    }
}

async fn check_anki(http_client: &reqwest::Client, endpoint: &str) -> bool {
    let anki = AnkiClient {
        endpoint,
        client: http_client.clone(),
    };
    anki.request(VersionRequest).await.is_ok()
}
