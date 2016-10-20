#!/bin/bash
# A script to release a new version of dorbel-shared module.

VERSION=""

if [ $# -eq 0 ]; then
    echo "No arguments provided."
    echo "[npm run release v0.0.1] should work."
    exit 1
fi

if [ ! -z "$1" ]; then
  VERSION=$1
fi

echo "Starting release of ${VERSION}."

# Change version in all npm package files
npm version $VERSION --force

# Release application
git add .
git commit -m 'new version release'
git tag -a $VERSION -m 'new version release'
git push --all --follow-tags
