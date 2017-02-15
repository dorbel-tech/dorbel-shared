#!/bin/bash
# A script to release a new version of dorbel-shared module.

echo "Starting release."

echo -n "Please describe what was changed in this release: "
read MSG

# Change version in all npm package files
npm version patch -m $(MSG) --git-tag-version

# Release application
git push --follow-tags
