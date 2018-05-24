import {
  GraphQLSchema,
  TypeMap,
  GraphQLObjectType,
  print,
  astFromValue,
} from "graphql";

enum SEVERITY {
  BREAKING,
  INFO,
}
enum CHANGES {
  TYPE_REMOVED,
  TYPE_ADDED,
}

const levels = {
  [SEVERITY.BREAKING]: [],
  [SEVERITY.INFO]: [],
};

const isInvalid = value => value === undefined || value !== value;

export const findRemovedTypes = (current: TypeMap, next: TypeMap) => {
  const messages = {
    [CHANGES.TYPE_REMOVED]: { ...levels },
    [CHANGES.TYPE_ADDED]: { ...levels },
  };
  // current => next
  Object.keys(current).forEach(typeName => {
    const type = current[typeName];
    // if we have removed this type we can early exit since thats the
    // most critical information
    if (!next[typeName]) {
      messages[CHANGES.TYPE_REMOVED][SEVERITY.BREAKING].push({
        type,
        code: CHANGES.TYPE_REMOVED,
        description: `${typeName} was removed`,
        printed: `type ${typeName}${getObjectNameFromType(type)} {}`,
      });
      return;
    }
  });

  // next => current
  Object.keys(next).forEach(typeName => {
    // if we have a new type we can early exit since thats the
    // most critical information
    const type = next[typeName];
    if (!current[typeName]) {
      messages[CHANGES.TYPE_ADDED][SEVERITY.INFO].push({
        type,
        code: CHANGES.TYPE_ADDED,
        description: `${typeName} was added`,
        printed: `type ${typeName}${getObjectNameFromType(type)} {
${printFields(type)}
}`,
      });
      return;
    }
  });
  return messages;
};

const printInputValue = arg => {
  let argDecl = `${arg.name}: ${String(arg.type)}`;
  if (!isInvalid(arg.defaultValue)) {
    argDecl += ` = ${print(astFromValue(arg.defaultValue, arg.type))}`;
  }
  return argDecl;
};

const printArgs = (args, indentation = "") => {
  if (args.length === 0) return "";
  return `(${args.map(printInputValue).join(", ")})`;
};

const printFields = type =>
  Object.values(type.getFields())
    .map((f, i) => `  ${f.name}${printArgs(f.args, "  ")}: ${String(f.type)}`)
    .join("\n");

const getObjectNameFromType = (type: GraphQLObjectType): string => {
  const interfaces = type.getInterfaces();
  return interfaces.length
    ? " implements " + interfaces.map(i => i.name).join(" & ")
    : "";
};

const headers = {
  breaking: val => (val.length > 0 ? "# Breaking" : ""),
  info: val => (val.length > 0 ? "# Safe" : ""),
};

export const printWithChanges = (current, next) => {
  const currentTypeMap = current.getTypeMap();
  const newTypeMap = next.getTypeMap();

  const details = findRemovedTypes(currentTypeMap, newTypeMap);
  return `
${headers.breaking(details[CHANGES.TYPE_REMOVED][SEVERITY.BREAKING])}
${details[CHANGES.TYPE_REMOVED][SEVERITY.BREAKING]
    .map(({ printed }) => printed)
    .join("\n")}

${headers.info(details[CHANGES.TYPE_REMOVED][SEVERITY.INFO])}
${details[CHANGES.TYPE_REMOVED][SEVERITY.INFO]
    .map(({ printed }) => printed)
    .join("\n")}
  `;
};
