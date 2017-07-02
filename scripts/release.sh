#!/bin/bash
# A script to release a new version of dorbel-shared module.

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ $BRANCH != "master" ]]; then
  echo "Sorry, releases allowed on master branch only!"
  exit 1
fi


echo "Starting release."

echo -n "Please describe what was changed in this release: "
read MSG

# Change version in all npm package files
npm version patch --git-tag-version -m "$MSG"

# Release application
git push --follow-tags
