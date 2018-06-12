declare module '@babel/types' {
    export * from 'babel-types';
}
declare module '@babel/generator' {
    export * from 'babel-generator';
    import Generator from 'babel-generator';
    export default Generator;
}
