use structopt::StructOpt;

// we must define the module here for the commands:: module to be able to
// import it from super::
pub mod agm;
mod commands;

#[derive(StructOpt)]
enum Apollo {
    #[allow(non_camel_case_types)]
    download_schema {
        /// Where to output the downloaded schema, either `stdout` or a file path
        #[structopt(parse(from_os_str), short)]
        output: std::path::PathBuf,

        /// target to output the schema to (json | graphql)
        /// default = json
        #[structopt(default_value = "json", short, long)]
        target: String,

        /// Apollo Graph Manager graph id
        #[structopt(short, long = "graphId")]
        graph_id: String,

        /// Variant for the graph download
        #[structopt(default_value = "current", long, short)]
        variant: String,
        /// Api key for Apollo Graph Manager, can be a service api key or a user token
        /// If this flag isn't passed, this can also pull from the ENGINE_API_KEY env variable
        #[structopt(
            short = "k",
            long = "apiKey",
            env = "ENGINE_API_KEY",
            hide_env_values = true
        )]
        api_key: String,
    },
}

fn main() {
    match Apollo::from_args() {
        Apollo::download_schema {
            target,
            graph_id,
            variant,
            api_key,
            output,
        } => commands::download_schema::download_schema_command(
            target, graph_id, variant, api_key, output,
        ),
    }
}
