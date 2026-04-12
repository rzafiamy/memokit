#!/bin/bash

# MemoKit Deployment Script
# Packages the extension into a zip file for deployment.

# Configuration
EXT_NAME="memokit"
VERSION=$(grep '"version"' manifest.json | cut -d '"' -f 4)
DIST_DIR="dist"
FILENAME="${EXT_NAME}-v${VERSION}.zip"

echo "🚀 Preparing ${EXT_NAME} v${VERSION} for deployment..."

# Create dist directory if it doesn't exist
mkdir -p "${DIST_DIR}"

# Clean up any existing zip with the same version
rm -f "${DIST_DIR}/${FILENAME}"

# Package the extension
# Exclude git files, dist directory, and other unnecessary files
zip -r "${DIST_DIR}/${FILENAME}" . -x "*.git*" "dist/*" "deploy.sh" ".gitignore" "rules.md" "*.zip"

if [ $? -eq 0 ]; then
    echo "✅ Successfully packaged to ${DIST_DIR}/${FILENAME}"
else
    echo "❌ Failed to package extension."
    exit 1
fi
