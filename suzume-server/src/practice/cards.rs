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
            .filter(|(_, value)| !value.trim().is_empty())
            .map(|(name, value)| format!("- {name}: {value}"))
            .collect::<Vec<_>>()
            .join("\n")
    }
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
    ) -> Result<Option<PracticeCard>, SamplerError> {
        let anki = AnkiClient {
            endpoint: &self.endpoint,
            client: self.client.clone(),
        };

        let escaped = deck.replace('"', "\\\"");
        let query = match scope {
            CardScope::Today => format!("deck:\"{}\" rated:1", escaped),
            CardScope::All => format!("deck:\"{}\" prop:reps>0", escaped),
        };

        let card_ids = anki.request(FindCardsRequest { query }).await?;

        let chosen = {
            let mut rng = rand::thread_rng();
            card_ids.into_iter().choose(&mut rng)
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

        let fields = ordered
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
