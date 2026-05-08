use serde::Serialize;
use similar::{ChangeTag, TextDiff};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SegmentKind {
    Equal,
    Removed,
    Added,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffSegment {
    pub kind: SegmentKind,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Feedback {
    pub has_mistakes: bool,
    pub original: String,
    pub corrected: String,
    pub diff_original: Vec<DiffSegment>,
    pub diff_corrected: Vec<DiffSegment>,
}

pub fn build(original: &str, corrected: &str) -> Feedback {
    let diff = TextDiff::from_words(original, corrected);

    let mut diff_original: Vec<DiffSegment> = Vec::new();
    let mut diff_corrected: Vec<DiffSegment> = Vec::new();

    for change in diff.iter_all_changes() {
        let value = change.value().to_string();
        match change.tag() {
            ChangeTag::Equal => {
                push_segment(&mut diff_original, SegmentKind::Equal, &value);
                push_segment(&mut diff_corrected, SegmentKind::Equal, &value);
            }
            ChangeTag::Delete => {
                push_segment(&mut diff_original, SegmentKind::Removed, &value);
            }
            ChangeTag::Insert => {
                push_segment(&mut diff_corrected, SegmentKind::Added, &value);
            }
        }
    }

    let has_mistakes = diff_original
        .iter()
        .any(|segment| !is_blank_or_equal(segment))
        || diff_corrected
            .iter()
            .any(|segment| !is_blank_or_equal(segment));

    Feedback {
        has_mistakes,
        original: original.to_string(),
        corrected: corrected.to_string(),
        diff_original,
        diff_corrected,
    }
}

fn push_segment(target: &mut Vec<DiffSegment>, kind: SegmentKind, text: &str) {
    if text.is_empty() {
        return;
    }

    if let Some(last) = target.last_mut() {
        if last.kind == kind {
            last.text.push_str(text);
            return;
        }
    }

    target.push(DiffSegment {
        kind,
        text: text.to_string(),
    });
}

fn is_blank_or_equal(segment: &DiffSegment) -> bool {
    segment.kind == SegmentKind::Equal || segment.text.trim().is_empty()
}
