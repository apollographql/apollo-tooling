use graphql_client::*;

// The paths are relative to the directory where your `Cargo.toml` is located.
// Both json and the GraphQL schema language are supported as sources for the schema
#[derive(GraphQLQuery)]
#[graphql(
  schema_path = "schema.json",
  query_path = "src/operations/get_schema_by_tag.graphql",
  response_derives = "Debug, Serialize, Deserialize"
)]
pub struct GetSchemaByTag;

pub fn resolve_schema_from_agm(
  variables: get_schema_by_tag::Variables,
  api_key: String,
) -> Result<get_schema_by_tag::GetSchemaByTagServiceSchema, failure::Error> {
  // this is the important line
  let request_body = GetSchemaByTag::build_query(variables);

  let client = reqwest::Client::new();

  let mut res = client
    .post("https://engine-staging-graphql.apollographql.com/api/graphql")
    .header("x-api-key", api_key)
    .json(&request_body)
    .send()?;

  // parse the response for data.service.schema
  let response_body: Response<get_schema_by_tag::ResponseData> = res.json()?;
  let response_data: get_schema_by_tag::ResponseData = response_body
    .data
    .expect("Missing response data from GetSchemaByTag");
  let service = response_data.service.unwrap();
  let schema = service.schema.unwrap();

  Ok(schema)
}
