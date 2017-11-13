// Suppress missing types for @babel/types and @babel/generator by
// creating an alias for them to babel-types and babel-generator respectively.

declare module '@babel/types' {
  export * from 'babel-types';
}
declare module '@babel/generator' {
  export * from 'babel-generator';

  import Generator from 'babel-generator';
  export default Generator;
}
