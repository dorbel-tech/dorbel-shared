#!/bin/bash
# A script to release a new version of dorbel-shared module.

echo "Starting release of ${VERSION}."

# Change version in all npm package files
npm version patch -m --git-tag-version

# Release application
git push --follow-tags
