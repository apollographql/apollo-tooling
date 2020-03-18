// // // // // // // //
// // // // // // // //
// // // // // // // //
//    THE TRAITS     //
// // // // // // // //
// // // // // // // //
// // // // // // // //

/// traits are similar to interfaces. This says that anything that
/// implements a `NodeVisitor` must implement the visit_name
/// a visitor must be able to visit any kind of node, so any
/// visitor must implement all these functions
trait NodeVisitor {
    fn visit_document(&mut self, d: &Document);
    fn visit_definition(&mut self, d: &Definition);
    fn visit_name(&mut self, n: &Name);
    fn visit_scalar_type(&mut self, st: &ScalarType);
    fn visit_type_definition(&mut self, td: &TypeDefinition);
}

/// Any struct (DocumentNodes) that implement this trait much allow
/// the user to implement the accept fn.
trait DocumentNode {
    fn accept(&self, nv: &mut dyn NodeVisitor);
}

// // // // // // // //
// // // // // // // //
// // // // // // // //
//    THE STRUCTS    //
// // // // // // // //
// // // // // // // //
// // // // // // // //

// ---------- Document ----------

pub struct Document {
    definitions: Vec<Definition>,
}

impl DocumentNode for Document {
    fn accept(&self, nv: &mut dyn NodeVisitor) {
        nv.visit_document(self);
    }
}

// ---------- Definition ----------

pub enum Definition {
    TypeDefinition(TypeDefinition),
}

impl DocumentNode for Definition {
    fn accept(&self, nv: &mut dyn NodeVisitor) {
        nv.visit_definition(self);
    }
}

// ---------- Type Definitions ----------

pub enum TypeDefinition {
    Scalar(ScalarType),
    // Object()
}

impl DocumentNode for TypeDefinition {
    fn accept(&self, nv: &mut dyn NodeVisitor) {
        nv.visit_type_definition(self);
    }
}

// ---------- Meta Nodes ----------

/// The name is a simple ast node that does nothing but
/// mention the name of the parent
#[derive(Debug)]
pub struct Name {
    pub value: String,
}

/// `Name` is a node, so I want to add the `accept` fn to that node
impl DocumentNode for Name {
    fn accept(&self, nv: &mut dyn NodeVisitor) {
        nv.visit_name(self);
    }
}

#[derive(Debug)]
pub struct Field {
    // pub position: Pos,
    pub description: Option<String>,
    pub name: Name,
    // pub arguments: Vec<InputValue<'a, T>>,
    pub field_type: Type,
    // pub directives: Vec<Directive<'a, T>>,
}

// ---------- Types ----------

#[derive(Debug)]
pub enum Type {
    NamedType,
    ListType(Box<Type>),
    NonNullType(Box<Type>),
}

#[derive(Debug)]
pub struct ScalarType {
    pub description: Option<String>,
    pub name: Name,
}

impl DocumentNode for ScalarType {
    fn accept(&self, nv: &mut dyn NodeVisitor) {
        nv.visit_scalar_type(&self);
    }
}

#[derive(Debug)]
pub struct ObjectType {
    pub description: Option<String>,
    pub name: Name,
    pub fields: Vec<Field>,
    // pub position: Pos,
    // pub description: Option<String>,
    // pub name: T::Value,
    // pub implements_interfaces: Vec<T::Value>,
    // pub directives: Vec<Directive<'a, T>>,
}

// // // // // // // //
// // // // // // // //
// // // // // // // //
//    THE PRINTER    //
// // // // // // // //
// // // // // // // //
// // // // // // // //

fn print(node: &dyn DocumentNode) -> String {
    struct Printer {
        output: String,
    }

    impl NodeVisitor for Printer {
        fn visit_name(&mut self, n: &Name) {
            self.output.push_str(&n.value);
        }
        fn visit_scalar_type(&mut self, st: &ScalarType) {
            match &st.description {
                Some(description) => self
                    .output
                    .push_str(&format!("\"\"\"\n{}\n\"\"\"\n", description)),
                None => {}
            }
            Printer::visit_name(self, &st.name);
            self.output.push_str(";\n");
        }
        fn visit_type_definition(&mut self, td: &TypeDefinition) {
            match td {
                TypeDefinition::Scalar(st) => {
                    Printer::visit_scalar_type(self, st);
                }
            }
        }
        fn visit_definition(&mut self, d: &Definition) {
            match d {
                Definition::TypeDefinition(td) => {
                    Printer::visit_type_definition(self, td);
                }
            }
        }
        fn visit_document(&mut self, d: &Document) {
            for definition in &d.definitions {
                Printer::visit_definition(self, definition);
            }
        }
    }

    let mut print_schema = Printer {
        output: std::string::String::new(),
    };
    node.accept(&mut print_schema);
    print_schema.output
}

fn main() {
    let my_document = Document {
        definitions: vec![
            Definition::TypeDefinition(TypeDefinition::Scalar(ScalarType {
                description: Some("a value that we can use :)".to_string()),
                name: Name {
                    value: "MyScalar".to_string(),
                },
            })),
            Definition::TypeDefinition(TypeDefinition::Scalar(ScalarType {
                description: None,
                name: Name {
                    value: "AnotherScalar".to_string(),
                },
            })),
        ],
    };
    println!("{}", print(&my_document));
}
