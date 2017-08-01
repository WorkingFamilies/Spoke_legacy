// const sum = require('./sum');
import { sum } from './sum';
import { graphql } from 'graphql';
import { schema, resolvers } from '../src/server/api/schema'; // comment out this line and the test should run normally - this suggests that we're failing to transpile spoke project code, but transpiling works on test code and node_modules

test('adds 1+2 to equal 3', () => {
  expect(sum(1,2)).toBe(3);
});

test('logs something', () => {
  console.log('test cache?');
  expect(1).toBeTruthy;
});