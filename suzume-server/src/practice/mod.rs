mod cards;
mod feedback;
mod session;

use axum::{
    Router,
    extract::{
        Query, State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::IntoResponse,
    routing::get,
};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

use crate::state::AppState;

use self::cards::CardSampler;
use self::feedback::Feedback;
use self::session::PracticeSession;

pub fn router() -> Router<AppState> {
    Router::new().route("/ws/practice", get(ws_practice))
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PracticeMode {
    Chat,
    Translate,
    Construct,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProficiencyLevel {
    A1,
    A2,
    B1,
    B2,
    C1,
    C2,
}

impl ProficiencyLevel {
    pub fn label(self) -> &'static str {
        match self {
            Self::A1 => "A1",
            Self::A2 => "A2",
            Self::B1 => "B1",
            Self::B2 => "B2",
            Self::C1 => "C1",
            Self::C2 => "C2",
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CardScope {
    Today,
    All,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TranslateDirection {
    From,
    To,
}

fn deserialize_optional_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = Option::<String>::deserialize(deserializer)?;
    Ok(value
        .map(|raw| raw.trim().to_owned())
        .filter(|trimmed| !trimmed.is_empty()))
}

#[derive(Debug, Deserialize)]
pub struct PracticeParams {
    pub deck: String,
    pub mode: PracticeMode,
    pub level: ProficiencyLevel,
    pub scope: CardScope,
    pub direction: Option<TranslateDirection>,
    #[serde(default, deserialize_with = "deserialize_optional_string")]
    pub model: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_string")]
    pub target_language: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum ClientMessage {
    User { content: String },
    Skip,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum ServerMessage<'a> {
    Assistant {
        content: &'a str,
        card: AssistantCard<'a>,
        #[serde(skip_serializing_if = "Option::is_none")]
        feedback: Option<&'a Feedback>,
    },
    Error {
        message: &'a str,
    },
}

#[derive(Debug, Serialize)]
struct AssistantCard<'a> {
    id: i64,
    target: &'a str,
    fields: std::collections::HashMap<&'a str, &'a str>,
}

async fn ws_practice(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<PracticeParams>,
) -> impl IntoResponse {
    if matches!(params.mode, PracticeMode::Translate) && params.direction.is_none() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            "translate mode requires `direction`",
        )
            .into_response();
    }

    info!(
        deck = %params.deck,
        mode = ?params.mode,
        level = ?params.level,
        scope = ?params.scope,
        direction = ?params.direction,
        "practice ws upgrade",
    );

    ws.on_upgrade(move |socket| run_session(socket, state, params))
}

async fn run_session(mut socket: WebSocket, state: AppState, params: PracticeParams) {
    let sampler = CardSampler::new(state.anki_http_client.clone(), state.anki_connect_url.clone());

    let mut session = match PracticeSession::new(&state, &params) {
        Ok(session) => session,
        Err(err) => {
            error!(?err, "failed to initialise practice session");
            send_error(&mut socket, "failed to initialise practice session").await;
            return;
        }
    };

    if let Err(err) = run_turn(&mut socket, &sampler, &mut session, &params, None, None).await {
        warn!(?err, "first practice turn failed");
        return;
    }

    while let Some(frame) = socket.recv().await {
        let message = match frame {
            Ok(message) => message,
            Err(err) => {
                debug!(?err, "websocket recv error, closing");
                break;
            }
        };

        let user_text = match message {
            Message::Text(text) => text.as_str().to_owned(),
            Message::Close(_) => {
                debug!("client closed practice session");
                break;
            }
            Message::Binary(_) | Message::Ping(_) | Message::Pong(_) => continue,
        };

        let parsed: ClientMessage = match serde_json::from_str(&user_text) {
            Ok(value) => value,
            Err(err) => {
                warn!(?err, "invalid client message, ignoring");
                send_error(&mut socket, "invalid message format").await;
                continue;
            }
        };

        let (user_reply, feedback) = match parsed {
            ClientMessage::User { content } => {
                let feedback = match session.correct(&content).await {
                    Ok(feedback) => feedback,
                    Err(err) => {
                        warn!(?err, "correction call failed; continuing without feedback");
                        None
                    }
                };
                (Some(content), feedback)
            }
            ClientMessage::Skip => {
                session.skip_current();
                (None, None)
            }
        };

        if let Err(err) = run_turn(
            &mut socket,
            &sampler,
            &mut session,
            &params,
            user_reply.as_deref(),
            feedback,
        )
        .await
        {
            warn!(?err, "practice turn failed");
            break;
        }
    }

    info!("practice session ended");
}

async fn run_turn(
    socket: &mut WebSocket,
    sampler: &CardSampler,
    session: &mut PracticeSession,
    params: &PracticeParams,
    user_reply: Option<&str>,
    feedback: Option<Feedback>,
) -> Result<(), TurnError> {
    let card = match sampler.pick_random(&params.deck, params.scope).await {
        Ok(Some(card)) => card,
        Ok(None) => {
            send_error(socket, "no cards match the selected scope").await;
            return Err(TurnError::NoCards);
        }
        Err(err) => {
            error!(?err, "failed to sample card");
            send_error(socket, "failed to fetch card from Anki").await;
            return Err(TurnError::Sampler);
        }
    };

    let assistant = match session.next_turn(&card, user_reply).await {
        Ok(content) => content,
        Err(err) => {
            error!(?err, "ollama chat failed");
            send_error(socket, "ollama failed to respond").await;
            return Err(TurnError::Ollama);
        }
    };

    let payload = ServerMessage::Assistant {
        content: &assistant,
        card: AssistantCard {
            id: card.id,
            target: &card.target,
            fields: card
                .fields
                .iter()
                .map(|(name, value)| (name.as_str(), value.as_str()))
                .collect(),
        },
        feedback: feedback.as_ref(),
    };

    let json = serde_json::to_string(&payload).map_err(|_| TurnError::Serialize)?;
    socket
        .send(Message::text(json))
        .await
        .map_err(|_| TurnError::Send)?;

    Ok(())
}

async fn send_error(socket: &mut WebSocket, message: &str) {
    let payload = ServerMessage::Error { message };
    if let Ok(json) = serde_json::to_string(&payload) {
        let _ = socket.send(Message::text(json)).await;
    }
}

#[derive(Debug)]
enum TurnError {
    NoCards,
    Sampler,
    Ollama,
    Serialize,
    Send,
}
