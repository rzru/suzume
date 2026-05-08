use ollama_rs::{
    Ollama,
    generation::chat::{ChatMessage, request::ChatMessageRequest},
};

use crate::state::AppState;

use super::{
    PracticeMode, PracticeParams, ProficiencyLevel, TranslateDirection, cards::PracticeCard,
};

const CHAT_HISTORY_TURNS: usize = 4;

#[derive(Debug)]
pub enum SessionError {
    OllamaInit(String),
    Ollama(ollama_rs::error::OllamaError),
}

impl std::fmt::Display for SessionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::OllamaInit(err) => write!(f, "ollama init: {err}"),
            Self::Ollama(err) => write!(f, "ollama: {err}"),
        }
    }
}

impl std::error::Error for SessionError {}

pub struct PracticeSession {
    ollama: Ollama,
    model: String,
    system: ChatMessage,
    history: Vec<ChatMessage>,
    mode: PracticeMode,
    direction: Option<TranslateDirection>,
}

impl PracticeSession {
    pub fn new(state: &AppState, params: &PracticeParams) -> Result<Self, SessionError> {
        let ollama = Ollama::try_new(state.ollama_base_url.as_str())
            .map_err(|err| SessionError::OllamaInit(err.to_string()))?;
        let system =
            ChatMessage::system(system_prompt(params.mode, params.level, params.direction));

        Ok(Self {
            ollama,
            model: state.ollama_model.clone(),
            system,
            history: Vec::new(),
            mode: params.mode,
            direction: params.direction,
        })
    }

    pub async fn next_turn(
        &mut self,
        card: &PracticeCard,
        user_reply: Option<&str>,
    ) -> Result<String, SessionError> {
        let cleaned_reply = user_reply
            .map(str::trim)
            .filter(|reply| !reply.is_empty())
            .map(str::to_owned);

        let user_content =
            build_user_message(self.mode, self.direction, card, cleaned_reply.as_deref());

        let prompt_messages = self.assemble_prompt(ChatMessage::user(user_content));

        let request = ChatMessageRequest::new(self.model.clone(), prompt_messages).think(false);

        let response = self
            .ollama
            .send_chat_messages(request)
            .await
            .map_err(SessionError::Ollama)?;

        let mut stored = response.message.clone();
        stored.content = strip_thinking(&stored.content);

        if matches!(self.mode, PracticeMode::Chat) {
            if let Some(reply) = cleaned_reply {
                self.history.push(ChatMessage::user(reply));
            }
            self.history.push(stored.clone());
            self.trim_history();
        }

        Ok(stored.content)
    }

    fn assemble_prompt(&self, current: ChatMessage) -> Vec<ChatMessage> {
        let mut prompt = Vec::with_capacity(self.history.len() + 2);
        prompt.push(self.system.clone());
        if matches!(self.mode, PracticeMode::Chat) {
            prompt.extend(self.history.iter().cloned());
        }
        prompt.push(current);
        prompt
    }

    fn trim_history(&mut self) {
        let max_messages = CHAT_HISTORY_TURNS * 2;
        if self.history.len() > max_messages {
            let drop_n = self.history.len() - max_messages;
            self.history.drain(..drop_n);
        }
    }
}

fn strip_thinking(content: &str) -> String {
    let mut out = String::with_capacity(content.len());
    let mut rest = content;

    while let Some(open) = rest.find("<think>") {
        out.push_str(&rest[..open]);
        let after_open = &rest[open + "<think>".len()..];
        match after_open.find("</think>") {
            Some(close) => {
                rest = &after_open[close + "</think>".len()..];
            }
            None => {
                rest = "";
                break;
            }
        }
    }

    out.push_str(rest);
    out.trim().to_owned()
}

fn system_prompt(
    mode: PracticeMode,
    level: ProficiencyLevel,
    direction: Option<TranslateDirection>,
) -> String {
    let role_block = match (mode, direction) {
        (PracticeMode::Chat, _) => {
            "ROLE: friendly language tutor in casual conversation.\n\
            OUTPUT (every turn): one short reply (1-2 sentences) in the card's language that \
            naturally uses the target word given that turn. Build on the learner's last \
            message when it makes sense.\n\
            FORMAT: wrap the form of the target word you actually use in **double asterisks** \
            (e.g. **example**). No other formatting, no quotes, no explanations."
        }
        (PracticeMode::Translate, Some(TranslateDirection::From))
        | (PracticeMode::Translate, None) => {
            "ROLE: language tutor producing example sentences.\n\
            OUTPUT (every turn): exactly ONE short, natural sentence in the card's language \
            that uses the target word given that turn.\n\
            FORMAT: wrap the form of the target word you actually use in **double asterisks** \
            (e.g. **example**). No prefix, no translation, no explanation, no quotes, no \
            other formatting."
        }
        (PracticeMode::Translate, Some(TranslateDirection::To)) => {
            "ROLE: language tutor producing reverse-translation drills.\n\
            OUTPUT (every turn): exactly ONE short sentence written ENTIRELY in a language \
            OTHER than the card's language (default English; if the card is English, use \
            Spanish), chosen so its natural translation into the card's language uses the \
            target word.\n\
            FORMAT: just the sentence — no labels, quotes, parentheses, notes, or \
            explanations. Do NOT output the card-language version. Do NOT include the target \
            word in any language."
        }
    };

    format!(
        "{role_block}\n\n\
        LEARNER LEVEL: CEFR {level}. The level constraints below are absolute, even when the \
        target word itself sits above the level — keep every other word inside the allowed \
        range.\n\n\
        {level_block}",
        level = level.label(),
        level_block = level_guidance(level),
    )
}

fn level_guidance(level: ProficiencyLevel) -> &'static str {
    match level {
        ProficiencyLevel::A1 => {
            "LEVEL RULES (A1 — absolute beginner). Hard limits, no exceptions:\n\
            - Vocabulary: only the ~500 most common everyday words (family, food, numbers, \
              colors, days, weather, basic feelings, common objects, basic actions).\n\
            - Grammar: present simple only. No past, no future, no perfect tenses, no \
              conditionals, no passive, no subjunctive, no modal nuance beyond \"can\".\n\
            - Sentence length: 3 to 7 words. No subordinate clauses. No more than one clause \
              per sentence.\n\
            - Forbidden: idioms, phrasal verbs, slang, abstract nouns, figurative language, \
              cultural references, technical or academic vocabulary."
        }
        ProficiencyLevel::A2 => {
            "LEVEL RULES (A2 — elementary). Hard limits:\n\
            - Vocabulary: high-frequency everyday words (~1000–1500). Topics like routine, \
              shopping, work, hobbies, travel basics, simple feelings.\n\
            - Grammar: present simple, present continuous, past simple, \"going to\" future, \
              basic modals (can, must, should). No present perfect continuous, no third \
              conditional, no passive, no subjunctive.\n\
            - Sentence length: 5 to 10 words. At most one simple subordinate clause joined by \
              \"and\", \"but\", \"because\", \"so\".\n\
            - Forbidden: idioms, phrasal verbs beyond the most common (\"get up\", \"go out\"), \
              slang, abstract or academic vocabulary, figurative language."
        }
        ProficiencyLevel::B1 => {
            "LEVEL RULES (B1 — intermediate). Limits:\n\
            - Vocabulary: common everyday and work/study words; you may use a few less frequent \
              words if context makes them clear. Avoid rare, literary, or technical terms.\n\
            - Grammar: all basic tenses including present perfect, past continuous, first and \
              second conditional, common modals, simple passive. Avoid heavy use of subjunctive \
              or third conditional.\n\
            - Sentence length: 7 to 15 words. One subordinate clause is fine; avoid stacking \
              multiple clauses.\n\
            - Allowed sparingly: very common idioms and phrasal verbs (\"give up\", \"look \
              forward to\"). Still avoid slang, dense figurative language, and abstract \
              academic register."
        }
        ProficiencyLevel::B2 => {
            "LEVEL RULES (B2 — upper intermediate). Limits:\n\
            - Vocabulary: broad everyday plus some abstract and topical vocabulary. You may \
              use precise synonyms and some less frequent words when they fit naturally.\n\
            - Grammar: full range of tenses, all conditionals, passive voice, reported \
              speech, modal nuance, relative clauses. Subjunctive is okay where natural.\n\
            - Sentence length: 10 to 20 words. Multiple clauses allowed but keep structure \
              clear.\n\
            - Allowed: common idioms, phrasal verbs, and figurative expressions. Avoid \
              archaic, highly literary, or jargon-heavy vocabulary."
        }
        ProficiencyLevel::C1 => {
            "LEVEL RULES (C1 — advanced). Limits:\n\
            - Vocabulary: rich and precise, including abstract, topical, and lightly \
              specialised terms. Use nuanced synonyms and collocations.\n\
            - Grammar: full grammatical range including inversion, cleft sentences, complex \
              conditionals, subjunctive, nuanced modals.\n\
            - Sentence length: up to ~25 words; complex multi-clause sentences are welcome \
              when they read naturally.\n\
            - Allowed: idioms, fixed expressions, register shifts, mild figurative language, \
              cultural allusions. Avoid deliberately obscure or archaic vocabulary."
        }
        ProficiencyLevel::C2 => {
            "LEVEL RULES (C2 — mastery / near-native). Guidelines:\n\
            - Vocabulary: full native-like range, including rare, literary, idiomatic, and \
              specialised terms when they fit the topic.\n\
            - Grammar: full sophisticated range with stylistic flexibility.\n\
            - Sentence length: whatever a skilled native writer would naturally use; complex \
              and layered sentences are fine.\n\
            - Allowed: idioms, wordplay, irony, cultural references, register shifts, \
              figurative and literary language."
        }
    }
}

fn build_user_message(
    mode: PracticeMode,
    direction: Option<TranslateDirection>,
    card: &PracticeCard,
    user_reply: Option<&str>,
) -> String {
    let target_line = if card.target.is_empty() {
        "Target word: (empty card — pick any salient word from the card fields)".to_owned()
    } else if matches!(
        (mode, direction),
        (PracticeMode::Translate, Some(TranslateDirection::To))
    ) {
        format!("Target word (in the card's language): {}", card.target)
    } else {
        format!("Target word: {}", card.target)
    };

    let card_block = {
        let blob = card.fields_blob();
        if blob.is_empty() {
            String::new()
        } else {
            format!("\n\nCard:\n{blob}")
        }
    };

    let mut card_section = format!("{target_line}{card_block}");

    if card.target.contains(char::is_whitespace) {
        card_section.push_str(
            "\n\n(The target above looks like a phrase — pick the single focus word from the \
            card fields and use that.)",
        );
    }

    match (mode, user_reply) {
        (PracticeMode::Chat, Some(reply)) => format!("{reply}\n\n---\n{card_section}"),
        _ => card_section,
    }
}
