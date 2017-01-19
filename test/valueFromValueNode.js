import { expect } from 'chai'

import {
  parseValue,
} from 'graphql';

import { valueFromValueNode }  from '../src/utilities/graphql';

describe('#valueFromValueNode', () => {
  it(`should return a number for an IntValue`, () => {
    const valueNode = parseValue("1");
    const value = valueFromValueNode(valueNode);

    expect(value).to.equal(1);
  });

  it(`should return a number for a FloatValue`, () => {
    const valueNode = parseValue("1.0");
    const value = valueFromValueNode(valueNode);

    expect(value).to.equal(1.0);
  });

  it(`should return a boolean for a BooleanValue`, () => {
    const valueNode = parseValue("true");
    const value = valueFromValueNode(valueNode);

    expect(value).to.equal(true);
  });

  it(`should return null for a NullValue`, () => {
    const valueNode = parseValue("null");
    const value = valueFromValueNode(valueNode);

    expect(value).to.equal(null);
  });

  it(`should return a string for a StringValue`, () => {
    const valueNode = parseValue("\"foo\"");
    const value = valueFromValueNode(valueNode);

    expect(value).to.equal("foo");
  });

  it(`should return a string for an EnumValue`, () => {
    const valueNode = parseValue("JEDI");
    const value = valueFromValueNode(valueNode);

    expect(value).to.equal("JEDI");
  });

  it(`should return an array for a ListValue`, () => {
    const valueNode = parseValue("[ \"foo\", 1, JEDI ]");
    const value = valueFromValueNode(valueNode);

    expect(value).to.deep.equal([ "foo", 1, "JEDI" ]);
  });

  it(`should return an object for an ObjectValue`, () => {
    const valueNode = parseValue("{ foo: \"foo\", bar: 1, bla: JEDI }");
    const value = valueFromValueNode(valueNode);

    expect(value).to.deep.equal({ foo: "foo", bar: 1, bla: "JEDI" });
  });
});
