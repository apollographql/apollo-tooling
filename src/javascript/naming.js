import * as Inflector from 'inflected';

/**
 * Generally every type name that is generated should be 'singular'.
 * Lists of items are represented using Array<> or [].
 */
export function getTypeNameFromFieldName(propertyName) {
  return Inflector.singularize(propertyName);
}
