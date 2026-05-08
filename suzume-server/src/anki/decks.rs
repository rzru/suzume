use std::collections::{BTreeMap, HashMap};

use anki_bridge::prelude::*;
use axum::{
    Json, Router,
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Serialize)]
struct DeckTreeResponse {
    decks: Vec<DeckNode>,
}

#[derive(Serialize)]
struct DeckNode {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    children: Vec<DeckNode>,
}

#[derive(Default)]
struct DeckTreeBuilder {
    id: Option<i64>,
    children: BTreeMap<String, DeckTreeBuilder>,
}

#[derive(Deserialize)]
struct DeckCountsParams {
    name: String,
}

#[derive(Serialize)]
struct DeckCountsResponse {
    today: usize,
    all: usize,
    learned: usize,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/anki/decks", get(get_anki_decks_tree))
        .route("/anki/decks/counts", get(get_anki_deck_counts))
}

async fn get_anki_decks_tree(State(state): State<AppState>) -> impl IntoResponse {
    let anki = AnkiClient {
        endpoint: &state.anki_connect_url,
        client: state.http_client.clone(),
    };

    match anki.request(DeckNamesAndIdsRequest).await {
        Ok(deck_names_and_ids) => (
            StatusCode::OK,
            Json(DeckTreeResponse {
                decks: build_deck_tree(deck_names_and_ids),
            }),
        )
            .into_response(),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(ErrorResponse {
                error: error.to_string(),
            }),
        )
            .into_response(),
    }
}

async fn get_anki_deck_counts(
    State(state): State<AppState>,
    Query(params): Query<DeckCountsParams>,
) -> impl IntoResponse {
    let anki = AnkiClient {
        endpoint: &state.anki_connect_url,
        client: state.anki_http_client.clone(),
    };

    let escaped_name = params.name.replace('"', "\\\"");
    let rated_today_fut = anki.request(FindCardsRequest {
        query: format!("deck:\"{}\" rated:1", escaped_name),
    });
    let ever_reviewed_fut = anki.request(FindCardsRequest {
        query: format!("deck:\"{}\" prop:reps>0", escaped_name),
    });
    let introduced_today_fut = anki.request(FindCardsRequest {
        query: format!("deck:\"{}\" introduced:1", escaped_name),
    });

    let (rated_today, ever_reviewed, introduced_today) =
        tokio::join!(rated_today_fut, ever_reviewed_fut, introduced_today_fut);

    let rated_today = match rated_today {
        Ok(value) => value,
        Err(error) => return anki_error(error),
    };
    let ever_reviewed = match ever_reviewed {
        Ok(value) => value,
        Err(error) => return anki_error(error),
    };
    let introduced_today = match introduced_today {
        Ok(value) => value,
        Err(error) => return anki_error(error),
    };

    (
        StatusCode::OK,
        Json(DeckCountsResponse {
            today: rated_today.len(),
            all: ever_reviewed.len(),
            learned: introduced_today.len(),
        }),
    )
        .into_response()
}

fn anki_error(error: anki_bridge::Error) -> axum::response::Response {
    (
        StatusCode::BAD_GATEWAY,
        Json(ErrorResponse {
            error: error.to_string(),
        }),
    )
        .into_response()
}

fn build_deck_tree(deck_names_and_ids: HashMap<String, DeckId>) -> Vec<DeckNode> {
    let mut entries: Vec<(String, DeckId)> = deck_names_and_ids.into_iter().collect();
    entries.sort_by(|a, b| a.0.cmp(&b.0));

    let mut root = DeckTreeBuilder::default();
    for (deck_name, deck_id) in entries {
        let parts = deck_name
            .split("::")
            .filter(|part| !part.is_empty())
            .collect::<Vec<_>>();
        root.insert(&parts, deck_id);
    }

    root.into_nodes()
}

impl DeckTreeBuilder {
    fn insert(&mut self, parts: &[&str], id: DeckId) {
        if parts.is_empty() {
            self.id = Some(id);
            return;
        }

        let child = self.children.entry(parts[0].to_owned()).or_default();
        child.insert(&parts[1..], id);
    }

    fn into_nodes(self) -> Vec<DeckNode> {
        self.children
            .into_iter()
            .map(|(name, child)| DeckNode {
                name,
                id: child.id,
                children: child.into_nodes(),
            })
            .collect()
    }
}
