use std::collections::HashMap;
use std::sync::Arc;

use mongodb::{
    bson::{Bson, Document},
    event::{command::CommandEventHandler, sdam::SdamEventHandler},
    options::{ClientOptions, FindOptions, ServerAddress, Credential, ServerApi, ServerApiVersion},
    results::CollectionSpecification,
    sync::{Client, Cursor},
};
use tauri::command;

use crate::mongodb_events::{
    CommandInfoHandler, ServerDescription, ServerInfoHandler, DATABASE_HEARTBEAT,
    DATABASE_TOPOLOGY, SERVER_METRIC,
};
use crate::{error::PError, model::DatabaseInformation};
use crate::{
    model::{AppArg, BsonType},
    mongodb_events::FinishedCommandInfo,
};

#[command]
pub async fn mongodb_connect(
    state: AppArg<'_>,
    url: String,
    port: u16,
) -> Result<Document, PError> {
println!("Starting: {}", url);
    let client = Client::with_uri_str(url)?;
    println!("Connected successfully");
    let result = DatabaseInformation::from_client(&client)?;

    {
        let mut handle = state.client.lock().unwrap();
        *handle = Some(client);
    }

    Ok(result)
}

#[command]
pub async fn mongodb_find_documents(
    state: AppArg<'_>,
    database_name: String,
    collection_name: String,
    page: i64,
    per_page: i64,
    documents_filter: Document,
    documents_projection: Document,
    documents_sort: Document,
) -> Result<Vec<Document>, PError> {
    let handle = &*state.client.lock().unwrap();
    let client = handle.as_ref().ok_or(PError::ClientNotAvailable)?;
    let database = client.database(&database_name);
    let collections = database.collection(&collection_name);
    let find_options = FindOptions::builder()
        .limit(per_page)
        .skip((per_page * page) as u64)
        .projection(documents_projection)
        .sort(documents_sort)
        .build();
    let result = collections
        .find(documents_filter, find_options)
        .and_then(|cursor| cursor.collect::<Result<Vec<_>, _>>())?;
    Ok(result)
}

#[command]
pub async fn mongodb_count_documents(
    state: AppArg<'_>,
    database_name: String,
    collection_name: String,
    documents_filter: Document,
) -> Result<u64, PError> {
    let handle = &*state.client.lock().unwrap();
    let client = handle.as_ref().ok_or(PError::ClientNotAvailable)?;
    let database = client.database(&database_name);
    let collections = database.collection::<Document>(&collection_name);
    let result = collections.count_documents(documents_filter, None)?;
    Ok(result)
}

#[command]
pub async fn mongodb_aggregate_documents(
    state: AppArg<'_>,
    database_name: String,
    collection_name: String,
    stages: Vec<Document>,
) -> Result<Vec<Document>, PError> {
    let handle = &*state.client.lock().unwrap();
    let client = handle.as_ref().ok_or(PError::ClientNotAvailable)?;
    let database = client.database(&database_name);
    let collections = database.collection::<Document>(&collection_name);
    let result = collections
        .aggregate(stages, None)
        .and_then(|cursor| cursor.collect::<Result<Vec<Document>, _>>())?;
    Ok(result)
}

#[command]
pub async fn mongodb_get_database_topology() -> Vec<ServerDescription> {
    let handle = &*DATABASE_TOPOLOGY.lock().unwrap();
    handle.get_database_topology()
}

#[command]
pub async fn mongodb_get_connection_heartbeat() -> Vec<(usize, usize)> {
    let handle = &*DATABASE_HEARTBEAT.lock().unwrap();
    handle.get_connection_heartbeat()
}

#[command]
pub async fn mongodb_get_commands_statistics_per_sec(count: usize) -> Vec<(usize, usize, usize)> {
    let handle = &*SERVER_METRIC.lock().unwrap();
    handle.get_commands_statistics_per_sec(count)
}

#[command]
pub async fn mongodb_n_slowest_commands(count: usize) -> Vec<FinishedCommandInfo> {
    let handle = &*SERVER_METRIC.lock().unwrap();
    handle.get_n_slowest_commands(count)
}

#[command]
pub async fn mongodb_analyze_documents(
    state: AppArg<'_>,
    database_name: String,
    collection_name: String,
    documents_filter: Document,
) -> Result<Vec<(String, Vec<(BsonType, u64)>)>, PError> {
    let handle = &*state.client.lock().unwrap();
    let client = handle.as_ref().ok_or(PError::ClientNotAvailable)?;
    let database = client.database(&database_name);
    let collections = database.collection(&collection_name);
    let find_options = FindOptions::builder().limit(1000).build();

    let cursor: Cursor<Document> = collections.find(documents_filter, find_options)?;
    let mut result: HashMap<String, HashMap<BsonType, u64>> = HashMap::default();
    for document_cursor in cursor {
        let document = document_cursor?;
        for (document_key, document_value) in &document {
            let document_value_bson_type = BsonType::from(document_value);
            let entry: &mut HashMap<BsonType, u64> =
                result.entry(document_key.to_string()).or_default();
            let eentry = entry.entry(document_value_bson_type).or_default();
            *eentry = *eentry + 1;
        }
    }
    let r = result
        .into_iter()
        .map(|(k, v)| (k, v.into_iter().collect()))
        .collect();
    Ok(r)
}
