use std::collections::BTreeMap;

use anki_bridge::prelude::*;
use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::get};
use serde::Serialize;

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

pub fn router() -> Router<AppState> {
    Router::new().route("/anki/decks-tree", get(get_anki_decks_tree))
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

fn build_deck_tree(deck_names_and_ids: std::collections::HashMap<String, DeckId>) -> Vec<DeckNode> {
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
