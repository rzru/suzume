use std::collections::HashSet;

use anki_bridge::prelude::*;
use rand::seq::IteratorRandom;
use reqwest::Client;

use super::CardScope;

#[derive(Debug, Clone)]
pub struct PracticeCard {
    pub id: i64,
    pub fields: Vec<(String, String)>,
    pub target: String,
}

impl PracticeCard {
    pub fn fields_blob(&self) -> String {
        self.fields
            .iter()
            .map(|(name, value)| (name, strip_media(value)))
            .filter(|(_, value)| !value.trim().is_empty())
            .map(|(name, value)| format!("- {name}: {value}"))
            .collect::<Vec<_>>()
            .join("\n")
    }
}

fn strip_media(value: &str) -> String {
    let without_sound = strip_sound_markers(value);
    let without_imgs = strip_img_tags(&without_sound);
    collapse_whitespace(&without_imgs)
}

fn strip_sound_markers(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut rest = value;

    while let Some(open) = rest.find("[sound:") {
        out.push_str(&rest[..open]);
        let after_open = &rest[open + "[sound:".len()..];
        match after_open.find(']') {
            Some(close) => {
                rest = &after_open[close + 1..];
            }
            None => {
                rest = "";
                break;
            }
        }
    }

    out.push_str(rest);
    out
}

fn strip_img_tags(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut i = 0;

    while i < bytes.len() {
        if bytes[i] == b'<' {
            let rest = &value[i..];
            let lower_prefix: String = rest
                .chars()
                .take(5)
                .flat_map(char::to_lowercase)
                .collect();

            if lower_prefix.starts_with("<img")
                && rest
                    .as_bytes()
                    .get(4)
                    .is_some_and(|b| b.is_ascii_whitespace() || *b == b'>' || *b == b'/')
            {
                if let Some(end) = rest.find('>') {
                    i += end + 1;
                    continue;
                } else {
                    break;
                }
            }

            if lower_prefix.starts_with("</img") {
                if let Some(end) = rest.find('>') {
                    i += end + 1;
                    continue;
                } else {
                    break;
                }
            }
        }

        let ch_end = value[i..]
            .char_indices()
            .nth(1)
            .map(|(idx, _)| i + idx)
            .unwrap_or(bytes.len());
        out.push_str(&value[i..ch_end]);
        i = ch_end;
    }

    out
}

fn collapse_whitespace(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut prev_space = false;
    for ch in value.chars() {
        if ch.is_whitespace() {
            if !prev_space {
                out.push(' ');
                prev_space = true;
            }
        } else {
            out.push(ch);
            prev_space = false;
        }
    }
    out.trim().to_owned()
}

pub struct CardSampler {
    client: Client,
    endpoint: String,
}

#[derive(Debug)]
pub enum SamplerError {
    Anki(anki_bridge::Error),
}

impl std::fmt::Display for SamplerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Anki(err) => write!(f, "anki: {err}"),
        }
    }
}

impl std::error::Error for SamplerError {}

impl From<anki_bridge::Error> for SamplerError {
    fn from(value: anki_bridge::Error) -> Self {
        Self::Anki(value)
    }
}

impl CardSampler {
    pub fn new(client: Client, endpoint: String) -> Self {
        Self { client, endpoint }
    }

    pub async fn pick_random(
        &self,
        deck: &str,
        scope: CardScope,
        exclude: &HashSet<i64>,
    ) -> Result<Option<PracticeCard>, SamplerError> {
        let anki = AnkiClient {
            endpoint: &self.endpoint,
            client: self.client.clone(),
        };

        let escaped = deck.replace('"', "\\\"");
        let query = match scope {
            CardScope::Today => format!("deck:\"{}\" rated:1", escaped),
            CardScope::All => format!("deck:\"{}\" prop:reps>0", escaped),
            CardScope::Learned => format!("deck:\"{}\" introduced:1", escaped),
        };

        let card_ids = anki.request(FindCardsRequest { query }).await?;

        let chosen = {
            let mut rng = rand::thread_rng();
            card_ids
                .into_iter()
                .filter(|id| !exclude.contains(id))
                .choose(&mut rng)
        };

        let Some(card_id) = chosen else {
            return Ok(None);
        };

        let mut info = anki
            .request(CardsInfoRequest {
                cards: vec![card_id],
            })
            .await?;

        let Some(card) = info.pop() else {
            return Ok(None);
        };

        let mut ordered: Vec<(usize, String, String)> = card
            .fields
            .into_iter()
            .map(|(name, field)| (field.order, name, field.value))
            .collect();
        ordered.sort_by_key(|(order, _, _)| *order);

        let target = ordered
            .iter()
            .find(|(_, _, value)| !value.trim().is_empty())
            .map(|(_, _, value)| value.trim().to_owned())
            .unwrap_or_default();

        let fields: Vec<(String, String)> = ordered
            .into_iter()
            .map(|(_, name, value)| (name, value))
            .collect();

        Ok(Some(PracticeCard {
            id: card.card_id,
            fields,
            target,
        }))
    }
}
