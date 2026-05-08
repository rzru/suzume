use ollama_rs::{
    Ollama,
    generation::chat::{ChatMessage, request::ChatMessageRequest},
};

use crate::state::AppState;

use super::{PracticeMode, PracticeParams, ProficiencyLevel, TranslateDirection, cards::PracticeCard};

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
    history: Vec<ChatMessage>,
    mode: PracticeMode,
    direction: Option<TranslateDirection>,
}

impl PracticeSession {
    pub fn new(state: &AppState, params: &PracticeParams) -> Result<Self, SessionError> {
        let ollama = Ollama::try_new(state.ollama_base_url.as_str())
            .map_err(|err| SessionError::OllamaInit(err.to_string()))?;
        let history = vec![ChatMessage::system(system_prompt(
            params.mode,
            params.level,
            params.direction,
        ))];

        Ok(Self {
            ollama,
            model: state.ollama_model.clone(),
            history,
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

        let instruction = turn_instruction(self.mode, self.direction, card);

        let final_user_content = match cleaned_reply.as_deref() {
            Some(reply) => format!("{reply}\n\n{instruction}"),
            None => instruction,
        };

        let mut prompt_messages = self.history.clone();
        prompt_messages.push(ChatMessage::user(final_user_content));

        let request = ChatMessageRequest::new(self.model.clone(), prompt_messages);

        let response = self
            .ollama
            .send_chat_messages(request)
            .await
            .map_err(SessionError::Ollama)?;

        if let Some(reply) = cleaned_reply {
            self.history.push(ChatMessage::user(reply));
        }
        self.history.push(response.message.clone());

        Ok(response.message.content)
    }
}

fn system_prompt(
    mode: PracticeMode,
    level: ProficiencyLevel,
    direction: Option<TranslateDirection>,
) -> String {
    let mode_block = match (mode, direction) {
        (PracticeMode::Chat, _) => {
            "You are a friendly language tutor having an ongoing casual conversation with the \
            learner. Reply in the language of the card with one short message (1-2 sentences). \
            Refer to the learner's last message when it makes sense, ask follow-up questions, \
            or build on the topic."
        }
        (PracticeMode::Translate, Some(TranslateDirection::From)) => {
            "You are a language tutor producing example sentences. Output ONE short, natural \
            sentence in the language of the card that uses the requested target word. Output \
            only the sentence — no prefix, no translation, no explanation, no quotes."
        }
        (PracticeMode::Translate, Some(TranslateDirection::To)) => {
            "You are a language tutor producing reverse-translation drills. Pick a language \
            OTHER than the card's language (default to English; if the card itself is in \
            English, use Spanish). Output exactly ONE short sentence written ENTIRELY in that \
            other language, chosen so that when the learner translates it back into the card's \
            language it would naturally use the requested target word. Do NOT output the \
            card-language version. Do NOT include the target word itself in any language. No \
            labels, no quotes, no parentheses, no notes, no explanations — just the single \
            foreign-language sentence."
        }
        (PracticeMode::Translate, None) => {
            "You are a language tutor. Translate mode requires a direction; behave as if 'from' \
            was selected and produce a single short sentence in the card's language using the \
            requested target word."
        }
    };

    format!(
        "You are tutoring a learner at CEFR proficiency level {level}. Match your output to \
        that level (vocabulary, grammar, sentence length).\n\n{mode_block}\n\nEvery learner \
        message will end with a block delimited by [TUTOR INSTRUCTION] / [/TUTOR INSTRUCTION]. \
        That block tells you which target word your VERY NEXT reply must use. Always obey the \
        most recent block exactly. The target word changes EVERY turn — never reuse the target \
        from a previous turn. Never echo, mention, quote, or paraphrase the instruction block \
        itself; just produce the reply it asks for.",
        level = level.label(),
    )
}

fn turn_instruction(
    mode: PracticeMode,
    direction: Option<TranslateDirection>,
    card: &PracticeCard,
) -> String {
    let blob = card.fields_blob();
    let target_label = if card.target.is_empty() {
        "(empty card — pick any word from the fields below)".to_owned()
    } else {
        format!("\"{}\"", card.target)
    };

    let body = match (mode, direction) {
        (PracticeMode::Chat, _) => format!(
            "NEW target word for your next reply ONLY: {target_label}. Ignore every previous \
            target word. If the card looks like a full sentence, identify the actual focus \
            word inside it and use that single word. Continue the conversation in the card's \
            language with one short reply (1-2 sentences) that naturally uses the new target \
            word."
        ),
        (PracticeMode::Translate, Some(TranslateDirection::From)) => format!(
            "NEW target word for your next reply ONLY: {target_label}. Ignore every previous \
            target word. If the card is a full sentence, identify the actual focus word and \
            use that. Output exactly ONE short sentence in the card's language that uses the \
            new target word."
        ),
        (PracticeMode::Translate, Some(TranslateDirection::To)) => format!(
            "Reverse-translation drill. NEW target word (in the card's language) for your \
            next reply ONLY: {target_label}. Ignore every previous target word. If the card \
            is a full sentence, identify the actual focus word and use that. Output exactly \
            ONE short sentence written ENTIRELY in a language OTHER than the card's language \
            (use English by default; if the card is in English, use Spanish), chosen so that \
            translating it back to the card's language would naturally use the new target \
            word. Do NOT output the card-language sentence. Do NOT include the target word in \
            any language."
        ),
        (PracticeMode::Translate, None) => format!(
            "NEW target word for your next reply ONLY: {target_label}. Output exactly ONE \
            short sentence in the card's language that uses the new target word."
        ),
    };

    format!(
        "[TUTOR INSTRUCTION]\n{body}\n\nCurrent flashcard (context only — do not list back):\n\
        {blob}\n[/TUTOR INSTRUCTION]"
    )
}
