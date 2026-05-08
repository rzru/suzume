use ollama_rs::{
    Ollama,
    generation::chat::{ChatMessage, request::ChatMessageRequest},
};

use crate::state::AppState;

use super::{
    PracticeMode, PracticeParams, ProficiencyLevel, TranslateDirection, cards::PracticeCard,
    feedback::{self, Feedback},
};

const CHAT_HISTORY_TURNS: usize = 4;
const QUOTE_CHARS: &[char] = &[
    '"', '\'', '`', '\u{201C}', '\u{201D}', '\u{2018}', '\u{2019}',
];

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
    target_language: Option<String>,
    last_assistant: Option<String>,
    last_target: Option<String>,
}

impl PracticeSession {
    pub fn new(state: &AppState, params: &PracticeParams) -> Result<Self, SessionError> {
        let ollama = Ollama::try_new(state.ollama_base_url.as_str())
            .map_err(|err| SessionError::OllamaInit(err.to_string()))?;
        let system = ChatMessage::system(system_prompt(
            params.mode,
            params.level,
            params.direction,
            params.target_language.as_deref(),
        ));

        let model = params
            .model
            .clone()
            .unwrap_or_else(|| state.ollama_model.clone());

        Ok(Self {
            ollama,
            model,
            system,
            history: Vec::new(),
            mode: params.mode,
            direction: params.direction,
            target_language: params.target_language.clone(),
            last_assistant: None,
            last_target: None,
        })
    }

    pub fn skip_current(&mut self) {
        if matches!(self.mode, PracticeMode::Chat) {
            self.history.pop();
        }
        self.last_assistant = None;
        self.last_target = None;
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

        let user_content = build_user_message(
            self.mode,
            self.direction,
            self.target_language.as_deref(),
            card,
            cleaned_reply.as_deref(),
        );

        let prompt_messages = self.assemble_prompt(ChatMessage::user(user_content));

        let request = ChatMessageRequest::new(self.model.clone(), prompt_messages);

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

        self.last_assistant = Some(stored.content.clone());
        self.last_target = Some(card.target.clone());

        Ok(stored.content)
    }

    pub async fn correct(&self, user_reply: &str) -> Result<Option<Feedback>, SessionError> {
        let trimmed = user_reply.trim();
        if trimmed.is_empty() {
            return Ok(None);
        }

        let Some(last_assistant) = self.last_assistant.as_deref() else {
            return Ok(None);
        };

        let prompt = build_correction_prompt(
            self.mode,
            self.direction,
            self.last_target.as_deref(),
            last_assistant,
            trimmed,
        );

        let messages = vec![
            ChatMessage::system(correction_system_prompt().to_owned()),
            ChatMessage::user(prompt),
        ];

        let request = ChatMessageRequest::new(self.model.clone(), messages);

        let response = self
            .ollama
            .send_chat_messages(request)
            .await
            .map_err(SessionError::Ollama)?;

        let raw = strip_thinking(&response.message.content);
        let cleaned = clean_correction_output(&raw);
        let corrected = if cleaned.is_empty() {
            trimmed.to_owned()
        } else {
            cleaned
        };

        Ok(Some(feedback::build(trimmed, &corrected)))
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

fn clean_correction_output(raw: &str) -> String {
    let first_line = raw
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or("");

    let trimmed = first_line.trim_matches(QUOTE_CHARS).trim();
    trimmed.to_owned()
}

fn correction_system_prompt() -> &'static str {
    "You are a strict language proofreader. Output ONLY the corrected sentence on a single \
    line. No quotes, no labels, no explanations, no markdown. If the sentence is already \
    correct, return it exactly as given."
}

fn build_correction_prompt(
    mode: PracticeMode,
    direction: Option<TranslateDirection>,
    target: Option<&str>,
    last_assistant: &str,
    learner_reply: &str,
) -> String {
    match mode {
        PracticeMode::Chat => format!(
            "TUTOR (previous reply, in the card's language): {last_assistant}\n\
            LEARNER: {learner_reply}\n\n\
            Rewrite the LEARNER message naturally in the SAME language as TUTOR's reply, \
            fixing grammar, spelling, and word choice. If already correct, return it exactly \
            as given."
        ),
        PracticeMode::Translate => match direction {
            Some(TranslateDirection::To) => format!(
                "SOURCE: {last_assistant}\n\
                LEARNER TRANSLATION (in the card's language): {learner_reply}\n\n\
                Rewrite the learner's translation as a natural and accurate translation of \
                SOURCE in the card's language (the same language the learner used). If \
                already correct, return it exactly as given."
            ),
            Some(TranslateDirection::From) | None => format!(
                "SOURCE: {last_assistant}\n\
                LEARNER TRANSLATION: {learner_reply}\n\n\
                Rewrite the learner's translation as a natural and accurate translation of \
                SOURCE, in the SAME language the learner wrote in (auto-detect). If already \
                correct, return it exactly as given."
            ),
        },
        PracticeMode::Construct => {
            let target_clause = match target {
                Some(word) if !word.trim().is_empty() => format!(
                    " Keep the target word \"{word}\" (or any natural inflected form of it) \
                    in the rewrite — that target word's language IS the card's language."
                ),
                _ => String::new(),
            };
            format!(
                "Rewrite the LEARNER sentence naturally in the card's language, fixing \
                grammar, spelling, and word choice.{target_clause} If already correct, \
                return it exactly as given.\n\n\
                LEARNER: {learner_reply}"
            )
        }
    }
}

fn system_prompt(
    mode: PracticeMode,
    level: ProficiencyLevel,
    direction: Option<TranslateDirection>,
    target_language: Option<&str>,
) -> String {
    let role_block = match (mode, direction) {
        (PracticeMode::Chat, _) => {
            "ROLE: friendly language tutor having an ongoing casual conversation with the \
            learner.\n\
            BEHAVIOUR: each turn you will be given a target word and the source flashcard. \
            INFER the card's language from the target word together with the card fields \
            (script, readings, example sentence, definitions, etc.) and always reply \
            ENTIRELY in that language, even if the learner writes in English or another \
            language. One short message per reply (1-2 sentences). Refer to the learner's \
            last message when it makes sense, ask a follow-up question, or build on the \
            topic so the conversation keeps going. Each turn you will be given a NEW target \
            word to weave in naturally — never reuse a previous turn's target.\n\
            FORMAT: wrap the form of the target word you actually use in **double asterisks** \
            (e.g. **example**). No other formatting, no quotes, no meta commentary."
        }
        (PracticeMode::Translate, Some(TranslateDirection::From))
        | (PracticeMode::Translate, None) => {
            "ROLE: language tutor producing example sentences.\n\
            OUTPUT (every turn): exactly ONE short, natural sentence written ENTIRELY in the \
            card's language — INFER that language from the target word and the card fields \
            (script, readings, definitions, example sentence) shown each turn; do NOT switch \
            to English or any other language. The sentence MUST use the target word given \
            that turn.\n\
            FORMAT — MANDATORY, never skip even when reasoning about style: in your final \
            answer the form of the target word you actually use MUST be wrapped in **double \
            asterisks** so the UI can highlight it. Always include the asterisks. Example — \
            target word \"run\": I like to **run** in the morning. Apply the same wrapping \
            for any target word in any language (e.g. target \"бежать\" → Я люблю **бежать** \
            утром). No prefix, no translation, no explanation, no quotes, no other \
            formatting."
        }
        (PracticeMode::Translate, Some(TranslateDirection::To)) => {
            return translate_to_system_prompt(level, target_language);
        }
        (PracticeMode::Construct, _) => {
            "ROLE: language tutor handing the learner a single target word to build a \
            sentence with.\n\
            OUTPUT (every turn): exactly the target word given for that turn, written in the \
            card's language (INFER that language from the target word and the card fields \
            shown each turn), with no sentence, no example, no translation, no commentary, \
            no quotes, and no punctuation around it. Use the most natural citation form \
            (lemma) of the word for that language unless the card itself implies a specific \
            form.\n\
            FORMAT — MANDATORY: wrap the target word in **double asterisks** so the UI can \
            highlight it (e.g. **example**, **бежать**, **食べる**). Output ONLY that token \
            and nothing else."
        }
    };

    let level_block = match mode {
        PracticeMode::Chat => format!(
            "LEARNER LEVEL: CEFR {level}. Match the learner's vocabulary and grammar to that \
            level, but keep replies natural and conversational — short follow-up questions \
            are encouraged when they help the chat flow.",
            level = level.label(),
        ),
        PracticeMode::Translate => format!(
            "LEARNER LEVEL: CEFR {level}. The level constraints below are absolute, even when \
            the target word itself sits above the level — keep every other word inside the \
            allowed range.\n\n\
            {guidance}",
            level = level.label(),
            guidance = level_guidance(level),
        ),
        PracticeMode::Construct => format!(
            "LEARNER LEVEL: CEFR {level}. The learner will build their own sentence — your \
            job is just to deliver the target word cleanly.",
            level = level.label(),
        ),
    };

    format!("{role_block}\n\n{level_block}")
}

fn translate_to_system_prompt(
    level: ProficiencyLevel,
    target_language: Option<&str>,
) -> String {
    let role_block = match target_language {
        Some(language) => format!(
            "ROLE: language tutor producing reverse-translation drills.\n\
            OUTPUT (every turn): first INFER the card's language from the target word and \
            the card fields (script, readings, definitions, example sentence) shown each \
            turn. Then produce exactly ONE short sentence written ENTIRELY in {language}, \
            chosen so its natural translation into the card's language uses the target word. \
            If the card's language is also {language}, fall back to English (or to Spanish \
            if the card itself is in English).\n\
            FORMAT: just the sentence — no labels, quotes, parentheses, notes, or \
            explanations. Do NOT output the card-language version. Do NOT include the target \
            word in any language."
        ),
        None => "ROLE: language tutor producing reverse-translation drills.\n\
            OUTPUT (every turn): first INFER the card's language from the target word and \
            the card fields (script, readings, definitions, example sentence) shown each \
            turn. Then produce exactly ONE short sentence written ENTIRELY in a language \
            OTHER than the card's language (default English; if the card is in English, use \
            Spanish), chosen so its natural translation into the card's language uses the \
            target word.\n\
            FORMAT: just the sentence — no labels, quotes, parentheses, notes, or \
            explanations. Do NOT output the card-language version. Do NOT include the target \
            word in any language."
            .to_owned(),
    };

    let level_block = format!(
        "LEARNER LEVEL: CEFR {level}. The level constraints below are absolute, even when \
        the target word itself sits above the level — keep every other word inside the \
        allowed range.\n\n\
        {guidance}",
        level = level.label(),
        guidance = level_guidance(level),
    );

    format!("{role_block}\n\n{level_block}")
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
    target_language: Option<&str>,
    card: &PracticeCard,
    user_reply: Option<&str>,
) -> String {
    match mode {
        PracticeMode::Chat => build_chat_user_message(card, user_reply),
        PracticeMode::Translate => {
            build_translate_user_message(direction, target_language, card)
        }
        PracticeMode::Construct => build_construct_user_message(card),
    }
}

fn build_construct_user_message(card: &PracticeCard) -> String {
    let target_label = if card.target.is_empty() {
        "(empty card — pick any salient word from the card fields below)".to_owned()
    } else {
        format!("\"{}\"", card.target)
    };

    let language_line = "Card language: INFER it from the target word and the card fields \
        below (script, readings, definitions). Output the target word in that language; do \
        not switch to English or any other language.\n";

    let blob = card.fields_blob();
    let card_block = if blob.is_empty() {
        String::new()
    } else {
        format!("\n\nCard:\n{blob}")
    };

    let phrase_hint = if card.target.contains(char::is_whitespace) {
        "\n\n(The target above looks like a phrase — pick the single focus word from the \
        card fields and use that single word.)"
    } else {
        ""
    };

    let example = if card.target.is_empty() {
        "**word**".to_owned()
    } else {
        format!("**{}**", card.target)
    };

    format!(
        "{language_line}New target word for this turn: {target_label}.{card_block}{phrase_hint}\n\n\
        FORMAT REMINDER (MANDATORY): output ONLY the target word wrapped in double asterisks \
        ({example} or its natural citation form). No sentence, no translation, no \
        explanation, no quotes, no extra characters."
    )
}

fn build_chat_user_message(card: &PracticeCard, user_reply: Option<&str>) -> String {
    let target_label = if card.target.is_empty() {
        "(empty card — pick any salient word from the card fields below)".to_owned()
    } else {
        format!("\"{}\"", card.target)
    };

    let phrase_hint = if card.target.contains(char::is_whitespace) {
        " If the card looks like a full sentence or phrase, identify the actual focus word \
        inside it and use that single word."
    } else {
        ""
    };

    let blob = card.fields_blob();
    let card_block = if blob.is_empty() {
        String::new()
    } else {
        format!("\n\nCurrent flashcard (context only — do not list back):\n{blob}")
    };

    let language_clause = "Card language: INFER it from the target word and the card \
        fields below (script, readings, definitions, example sentence). Reply ENTIRELY in \
        that language; do not switch to English or any other language even if the learner \
        writes in another language.";

    let instruction = format!(
        "[TUTOR INSTRUCTION]\n\
        {language_clause}\n\
        NEW target word for your next reply ONLY: {target_label}. Ignore every previous \
        target word.\n\
        Continue the conversation with one short reply (1-2 sentences) that naturally uses \
        the new target word and, when it fits, asks a short follow-up question.{phrase_hint}\
        {card_block}\n\
        [/TUTOR INSTRUCTION]"
    );

    match user_reply {
        Some(reply) => format!("{reply}\n\n{instruction}"),
        None => instruction,
    }
}

fn build_translate_user_message(
    direction: Option<TranslateDirection>,
    target_language: Option<&str>,
    card: &PracticeCard,
) -> String {
    let is_reverse = matches!(direction, Some(TranslateDirection::To));

    let reverse_language_line = is_reverse.then(|| match target_language {
        Some(language) => format!(
            "Card language: INFER it from the target word and the card fields below (script, \
            readings, definitions, example sentence). The sentence you produce MUST be in \
            {language} (if the card itself is in {language}, fall back to English, or to \
            Spanish if the card is in English), and its natural translation back into the \
            card's language should use the target word.\n"
        ),
        None => "Card language: INFER it from the target word and the card fields below (script, \
            readings, definitions, example sentence). The sentence you produce MUST be in a \
            language OTHER than the card's language (default English; if the card is in \
            English, use Spanish), but its natural translation back into the card's language \
            should use the target word.\n"
            .to_owned(),
    });

    let language_line: &str = match reverse_language_line.as_deref() {
        Some(line) => line,
        None => "Card language: INFER it from the target word and the card fields below (script, \
            readings, definitions, example sentence). Write the sentence ENTIRELY in that \
            language; do not mix in English or any other language.\n",
    };

    let target_line = if card.target.is_empty() {
        "Target word: (empty card — pick any salient word from the card fields)".to_owned()
    } else if is_reverse {
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

    let mut card_section = format!("{language_line}{target_line}{card_block}");

    if card.target.contains(char::is_whitespace) {
        card_section.push_str(
            "\n\n(The target above looks like a phrase — pick the single focus word from the \
            card fields and use that.)",
        );
    }

    if !is_reverse {
        let example = if card.target.is_empty() {
            "**word**".to_owned()
        } else {
            format!("**{}**", card.target)
        };
        card_section.push_str(&format!(
            "\n\nFORMAT REMINDER (MANDATORY): in your final reply, wrap the exact form of the \
            target word you use in **double asterisks** ({example} or whatever inflected form \
            you actually use). Do not omit the asterisks. No other markdown."
        ));
    }

    card_section
}
