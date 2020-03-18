use std::error::Error;
use std::fs::File;
use std::io::prelude::*;
use std::path::Path;

// import from commands/mod.rs
use super::agm;

pub fn download_schema_command(
  target: String,
  graph_id: String,
  variant: String,
  api_key: String,
  output: std::path::PathBuf,
) {
  if target != "json" && target != "graphql" {
    panic!("Invalid target! Must be `json` or `graphql`");
  }

  let schema = agm::resolve_schema_from_agm(
    agm::get_schema_by_tag::Variables {
      id: graph_id,
      tag: variant,
    },
    api_key,
  )
  .expect("Could not fetch schema");

  let str_schema = serde_json::to_string(&schema).unwrap();

  // look at the output flag, if it is `stdout`, write to stdout, if it a file
  // write to the file, if it doesn't exist, do nothing??
  match &output.to_str() {
    Some("stdout") => {
      print!("{}", str_schema);
    }
    // an output file was given
    Some(_) => {
      let path = Path::new(&output);
      let display = path.display();

      // open file in write-only mode
      let mut file = File::create(&path).expect("couldn't create file provided with -o");

      // write schema to file
      match file.write_all(&str_schema.as_bytes()) {
        Err(e) => panic!("Couldn't write schema to {}: {}", display, e.description()),
        Ok(_) => println!("Written to {}", display),
      }
    }
    None => {}
  };
}
