use anki_bridge::prelude::*;
use axum::{
    Json, Router,
    body::Bytes,
    extract::{Path, State},
    http::{HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::Serialize;

use crate::state::AppState;

const MAX_FILENAME_LEN: usize = 256;

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/anki/media/{filename}", get(get_anki_media_file))
}

async fn get_anki_media_file(
    State(state): State<AppState>,
    Path(filename): Path<String>,
) -> Response {
    if !is_safe_filename(&filename) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "invalid filename".into(),
            }),
        )
            .into_response();
    }

    let anki = AnkiClient {
        endpoint: &state.anki_connect_url,
        client: state.anki_http_client.clone(),
    };

    let response = match anki
        .request(RetrieveMediaFileRequest {
            filename: filename.clone(),
        })
        .await
    {
        Ok(value) => value,
        Err(error) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ErrorResponse {
                    error: error.to_string(),
                }),
            )
                .into_response();
        }
    };

    let Some(encoded) = response.encoded_bytes else {
        return (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: format!("media file `{filename}` not found"),
            }),
        )
            .into_response();
    };

    let bytes = match BASE64.decode(encoded.as_bytes()) {
        Ok(value) => value,
        Err(error) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ErrorResponse {
                    error: format!("decode media file: {error}"),
                }),
            )
                .into_response();
        }
    };

    let content_type = guess_content_type(&filename);

    let mut response = (StatusCode::OK, Bytes::from(bytes)).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(content_type),
    );
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=86400, immutable"),
    );
    response
}

fn is_safe_filename(filename: &str) -> bool {
    if filename.is_empty() || filename.len() > MAX_FILENAME_LEN {
        return false;
    }

    if filename.contains('/') || filename.contains('\\') || filename.contains('\0') {
        return false;
    }

    if filename.split('.').any(|segment| segment == "..") {
        return false;
    }

    true
}

fn guess_content_type(filename: &str) -> &'static str {
    let ext = filename
        .rsplit_once('.')
        .map(|(_, ext)| ext.to_ascii_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "ogg" | "oga" => "audio/ogg",
        "mp3" => "audio/mpeg",
        "m4a" | "mp4" => "audio/mp4",
        "wav" => "audio/wav",
        "webm" => "audio/webm",
        "flac" => "audio/flac",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    }
}
