import {
  join,
  wrap,
} from '../utilities/printing';

export function interfaceDeclaration(generator, { interfaceName }, closure) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  generator.print(`export interface ${ interfaceName }`);
  generator.pushScope({ typeName: interfaceName });
  generator.withinBlock(closure);
  generator.popScope();
}

export function propertyDeclaration(generator, { propertyName, typeName, description, inInterface }, closure) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(description && `// ${description}`);
  if (closure) {
    generator.printOnNewline(`${propertyName}:`);
    generator.pushScope({ typeName: propertyName });
    generator.withinBlock(closure);
    generator.popScope();
  } else {
    generator.printOnNewline(`${propertyName}: ${typeName}`);
  }
  generator.print(inInterface ? ';' : ',');
}

export function propertyDeclarations(generator, properties) {
  if (!properties) return;
  properties.forEach(property => propertyDeclaration(generator, property));
}
