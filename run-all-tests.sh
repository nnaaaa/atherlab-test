#!/bin/bash

echo "Running Smart Contract Tests..."
cd smart-contracts && yarn test

echo "
Running Backend Tests..."
cd ../backend && yarn test

echo "
Running Frontend Tests..."
cd ../frontend && yarn test

echo "
All tests completed!"
