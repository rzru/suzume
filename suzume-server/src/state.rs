use reqwest::Client;

#[derive(Clone)]
pub struct AppState {
    pub http_client: Client,
    pub anki_http_client: Client,
    pub ollama_base_url: String,
    pub anki_connect_url: String,
}
