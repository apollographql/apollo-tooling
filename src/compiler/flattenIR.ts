import { inspect } from 'util';

import { GraphQLObjectType } from 'graphql';

import { SelectionSet, Field } from './';

export type FieldMap = Map<string, Field>;

export class Record {
  constructor(public possibleTypes: GraphQLObjectType[], public fieldMap: FieldMap = new Map()) {}

  get fields(): Field[] {
    return Array.from(this.fieldMap.values());
  }

  addField(field: Field, isConditional: boolean) {
    const responseKey = field.alias || field.name;

    const existingField = this.fieldMap.get(responseKey);
    if (existingField) {
      existingField.isConditional = existingField.isConditional && isConditional;

      if (field.selectionSet && existingField.selectionSet) {
        existingField.selectionSet.selections.push(...field.selectionSet.selections);
      }
    } else {
      this.fieldMap.set(responseKey, { ...field, isConditional });
    }
  }
}

export class TypeCase {
  default: Record;
  private recordsByType: Map<GraphQLObjectType, Record>;

  get records(): Record[] {
    // Unique the records before returning them.
    return Array.from(new Set(this.recordsByType.values()));
  }

  constructor(selectionSet: SelectionSet) {
    // We start out with a single record that represents all possible types of the selection set.
    const initialRecord = new Record(selectionSet.possibleTypes);

    // And we make all possible types map to it.
    this.recordsByType = new Map();
    for (const type of selectionSet.possibleTypes) {
      this.recordsByType.set(type, initialRecord);
    }

    // We also keep a default record that will continue to represent all possible types of the selection set.
    this.default = new Record(selectionSet.possibleTypes);

    this.visitSelectionSet(selectionSet);

    this.replaceFieldsWithObjectTypeSpecificDescriptionsIfAvailable();
  }

  private visitSelectionSet(selectionSet: SelectionSet, isConditional: boolean = false) {
    for (const selection of selectionSet.selections) {
      switch (selection.kind) {
        case 'Field':
          // Add the field to all records that represent the possible types of the selection set.
          for (const record of this.recordsFor(selectionSet.possibleTypes)) {
            record.addField(selection, isConditional);
          }

          // Also add the field to the default record as long as the selection set matches all possible types.
          if (this.default.possibleTypes.every(type => selectionSet.possibleTypes.includes(type))) {
            this.default.addField(selection, isConditional);
          }
          break;
        case 'TypeCondition':
          this.visitSelectionSet(selection.selectionSet, isConditional);
          break;
        case 'BooleanCondition':
          this.visitSelectionSet(selection.selectionSet, true);
          break;
      }
    }
  }

  // Returns records representing a set of possible types, making sure they are disjoint with other possible types.
  // That may involve refining the existing partition (https://en.wikipedia.org/wiki/Partition_refinement)
  // with the passed in set of possible types.
  private recordsFor(possibleTypes: GraphQLObjectType[]): Record[] {
    const records = possibleTypes
      .map(type => this.recordsByType.get(type))
      .filter(record => record) as Record[];

    const isRecordDisjoint = records.map(record => {
      return record.possibleTypes.every(type => possibleTypes.includes(type));
    });

    // If the records for the passed in possible types are already disjoint with other possible types, there
    // is no need to split them.
    if (isRecordDisjoint.every(boolean => boolean)) {
      return records;
    }

    // We keep a map from original records to split records. We'll then remove possible types from the
    // original record and move them to the split record.
    // This means the original record will be modified to represent the set theoretical difference between
    // the original set of possible types and the refinement set, and the split record will represent the
    // intersection.

    const splits: Map<Record, Record> = new Map();

    possibleTypes.forEach((type, index) => {
      // No need to split a record that is already disjoint with other possible types.
      if (isRecordDisjoint[index]) return;

      const originalRecord = records[index];

      let splitRecord = splits.get(originalRecord);
      if (!splitRecord) {
        splitRecord = new Record([], new Map(originalRecord.fieldMap));
        splits.set(originalRecord, splitRecord);
      }
      records[index] = splitRecord; // We return the split record
      splitRecord.possibleTypes.push(type);
    });

    for (const [record, splitRecord] of splits) {
      // Compute the difference.
      record.possibleTypes = record.possibleTypes.filter(type => !splitRecord.possibleTypes.includes(type));

      for (const type of splitRecord.possibleTypes) {
        this.recordsByType.set(type, splitRecord);
      }
    }

    return records;
  }

  replaceFieldsWithObjectTypeSpecificDescriptionsIfAvailable() {
    for (let record of [this.default, ...this.records]) {
      if (record.possibleTypes.length == 1) {
        const type = record.possibleTypes[0];
        const fieldDefMap = type.getFields();

        for (const [responseKey, field] of record.fieldMap) {
          const fieldDef = fieldDefMap[field.name];

          if (fieldDef && fieldDef.description) {
            record.fieldMap.set(responseKey, { ...field, description: fieldDef.description });
          }
        }
      }
    }
  }

  inspect() {
    return (
      `TypeCase\n` +
      `  default -> ${inspect(this.default.fields.map(field => field.name))}\n` +
      this.records
        .map(
          record =>
            `  ${inspect(record.possibleTypes)} -> ${inspect(record.fields.map(field => field.name))}\n`
        )
        .join('')
    );
  }
}
