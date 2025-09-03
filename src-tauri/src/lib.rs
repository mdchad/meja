#[macro_use]
extern crate lazy_static;

mod cmd;
mod error;
mod model;
mod mongodb_events;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(model::AppState::default())
        .invoke_handler(tauri::generate_handler![
            cmd::mongodb_connect,
            cmd::mongodb_find_documents,
            cmd::mongodb_count_documents,
            cmd::mongodb_aggregate_documents,
            cmd::mongodb_get_database_topology,
            cmd::mongodb_analyze_documents,
            cmd::mongodb_n_slowest_commands,
            cmd::mongodb_get_commands_statistics_per_sec,
            cmd::mongodb_get_connection_heartbeat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
