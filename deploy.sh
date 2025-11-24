#!/bin/bash

# Build the React app
npm run build

# Copy build folder to functions/hosting
rm -rf functions/hosting
cp -r build functions/hosting

# Deploy to Firebase
firebase deploy
