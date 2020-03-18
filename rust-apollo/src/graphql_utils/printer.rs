use graphql_parser::schema::*;

pub fn print_schema_from_ast(ast: Document) -> String {
  let mut schema_string = String::new();

  for def in ast.definitions {
    let to_concat = match def {
      Definition::TypeDefinition(typedef) => type_definition(typedef),
      _ => {
        println!("else");
        "...".to_string()
      }
    };
    schema_string.push_str(&to_concat);
  }

  schema_string
}

fn type_definition(definition: TypeDefinition) -> String {
  let mut definition_string = String::new();
  match definition {
    TypeDefinition::Object(object_type_definition) => {
      let fields = object_type_definition
        .fields
        .into_iter()
        .map(|f| f.name)
        .collect::<Vec<String>>();

      definition_string = format!("type {} {}", &object_type_definition.name, block(fields));
    }
    _ => {}
  };
  definition_string
}

/// Given array, print each item on its own line,
/// TODO: wrapped in an indented "{ }" block.
fn block(fields: Vec<String>) -> String {
  let fields_string = fields.join("\n  ");
  format!("{{\n  {}\n}}", fields_string)
}

#[cfg(test)]
mod tests {
  use super::*;
  use graphql_parser::parse_schema;
  #[test]
  fn should_print_simple_schema_to_sdl() {
    let simple_schema = "type Query {\n  hello: String\n}";
    let ast = parse_schema(simple_schema).unwrap();
    let printed = print_schema_from_ast(ast);
    assert_eq!(printed, simple_schema);
  }
}

/// abstract visitor
mod visit {
  pub trait Visitor<T> {}
}
