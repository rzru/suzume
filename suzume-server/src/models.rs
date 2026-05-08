use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::get};
use ollama_rs::Ollama;
use serde::Serialize;
use tracing::warn;

use crate::state::AppState;

#[derive(Serialize)]
struct ModelEntry {
    name: String,
    modified_at: String,
    size: u64,
}

#[derive(Serialize)]
struct ModelsResponse {
    models: Vec<ModelEntry>,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/api/models", get(get_models))
}

async fn get_models(State(state): State<AppState>) -> impl IntoResponse {
    let ollama = match Ollama::try_new(state.ollama_base_url.as_str()) {
        Ok(client) => client,
        Err(err) => {
            warn!(?err, "failed to construct ollama client for /api/models");
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(ErrorResponse {
                    error: format!("ollama init failed: {err}"),
                }),
            )
                .into_response();
        }
    };

    match ollama.list_local_models().await {
        Ok(models) => {
            let entries = models
                .into_iter()
                .map(|model| ModelEntry {
                    name: model.name,
                    modified_at: model.modified_at,
                    size: model.size,
                })
                .collect();
            (StatusCode::OK, Json(ModelsResponse { models: entries })).into_response()
        }
        Err(err) => {
            warn!(?err, "ollama list_local_models failed");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(ErrorResponse {
                    error: format!("ollama list failed: {err}"),
                }),
            )
                .into_response()
        }
    }
}
