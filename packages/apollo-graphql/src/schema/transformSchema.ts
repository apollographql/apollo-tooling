// import {
//   GraphQLSchema,
//   GraphQLNamedType,
//   isIntrospectionType,
//   isObjectType,
//   GraphQLObjectType,
//   GraphQLType,
//   isListType,
//   GraphQLList,
//   isNonNullType,
//   GraphQLNonNull,
//   GraphQLFieldConfigMap,
//   GraphQLFieldConfig,
// } from 'graphql';

// function transformSchema(schema: GraphQLSchema): GraphQLSchema {
//   const schemaConfig = schema.toConfig();

//   const types = schemaConfig.types!;
//   const typeMap = Object.fromEntries(
//     types.map(
//       type =>
//         [type.name, transformNamedType(type)] as [string, GraphQLNamedType],
//     ),
//   );

//   function transformNamedType(type: GraphQLNamedType): GraphQLNamedType {
//     if (isIntrospectionType(type)) return type;

//     if (isObjectType(type)) {
//       const config = type.toConfig();
//       return new GraphQLObjectType({
//         ...config,
//         interfaces: () => [...config.interfaces, EntityType],
//         fields: () => ({
//           ...replaceFields(config.fields),
//         }),
//       });
//     }

//     return type;
//   }

//   function replaceType(type: GraphQLType): GraphQLType {
//     if (isListType(type)) {
//       return new GraphQLList(replaceType(type.ofType));
//     } else if (isNonNullType(type)) {
//       return new GraphQLNonNull(replaceType(type.ofType));
//     }
//     return replaceNamedType(type);
//   }

//   function replaceNamedType(type: GraphQLNamedType): GraphQLNamedType {
//     return typeMap[type.name];
//   }

//   function replaceFields<TSource, TContext>(
//     fieldsMap: GraphQLFieldConfigMap<TSource, TContext>,
//   ): GraphQLFieldConfigMap<TSource, TContext> {
//     return Object.fromEntries(
//       Object.entries(fieldsMap).map(
//         ([name, field]) =>
//           [
//             name,
//             {
//               ...field,
//               type: replaceType(field.type),
//               args: field.args,
//             },
//           ] as [string, GraphQLFieldConfig<TSource, TContext>],
//       ),
//     );
//   }

//   return new GraphQLSchema({
//     ...schemaConfig,
//     types: Object.values(typeMap),
//   });
// }
