# Release Failure Fix - Summary

## Problem Identified

The npm publishing workflow was failing with the following errors:

1. `404 OIDC token exchange error - package not found` - OIDC authentication failed
2. `401 Unauthorized - GET https://registry.npmjs.org/-/whoami` - Token authentication failed

The workflow logs showed that:

- The workflow attempted to use npm's OIDC trusted publishing (as intended)
- When OIDC failed, it fell back to token authentication
- The token authentication also failed because no `NPM_TOKEN` was provided
- Even if a token was provided, it would be rejected because the package settings have "Require two-factor authentication and disallow tokens" enabled

## Root Cause

The repository workflow is correctly configured for npm OIDC trusted publishing, but the **trusted publisher relationship has not been configured on npmjs.org**. This is the missing link that causes the "package not found" error during OIDC token exchange.

## Solution Implemented

### Repository Changes (Completed)

1. **Updated `.github/workflows/release.yml`**:
   - Added `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}` environment variable to the Release step
   - This ensures semantic-release receives the token for fallback authentication (even though OIDC will be used once configured)

2. **Updated `.releaserc.json`**:
   - Configured `@semantic-release/npm` plugin with `provenance: true`
   - This enables cryptographic provenance attestations for supply chain security

3. **Created `NPM_TRUSTED_PUBLISHER_SETUP.md`**:
   - Comprehensive step-by-step guide for configuring the trusted publisher on npmjs.org
   - Troubleshooting section for common errors
   - References to official documentation

### Manual Steps Required (By Package Owner)

The package owner needs to complete the trusted publisher setup on npmjs.org:

1. Go to https://www.npmjs.com/package/@asup/context-menu/access
2. Find the "Trusted Publisher" section
3. Click "Edit" or "Add" to add a new trusted publisher
4. Enter the following values:
   - **Repository owner**: `PaulDThomas`
   - **Repository name**: `context-menu`
   - **Workflow file**: `release.yml`
   - **Environment** (optional): Leave blank
5. Save the configuration

## How It Works

Once the trusted publisher is configured:

1. When code is pushed to the `master` branch with a semantic commit message (e.g., `fix:`, `feat:`)
2. The GitHub Actions workflow runs
3. The workflow obtains an OIDC token from GitHub
4. semantic-release exchanges the OIDC token with npm for a temporary publishing token
5. The package is published with cryptographic provenance attestations
6. A GitHub release is created automatically

## Benefits of This Solution

✅ **More Secure**: No long-lived npm tokens to manage or potentially leak
✅ **Supply Chain Security**: Automatic provenance attestations prove package authenticity
✅ **Simpler Maintenance**: No manual token rotation needed
✅ **Better Compliance**: Meets modern security best practices for package distribution

## Alternative Solutions (Not Recommended)

If the package owner prefers NOT to use trusted publishing, they could:

1. Change the package access settings to allow tokens (less secure)
2. Generate an npm automation token
3. Add it as a GitHub secret named `NPM_TOKEN`

However, this approach is **not recommended** because:

- It's less secure (long-lived tokens can be compromised)
- No provenance attestations (less supply chain security)
- Requires manual token rotation and management
- Doesn't align with the existing package security settings

## Testing the Fix

After the manual setup is complete, test by:

1. Making a commit to master with a semantic message:

   ```bash
   git commit -m "fix: test trusted publishing"
   git push origin master
   ```

2. Monitor the GitHub Actions workflow run
3. Verify successful package publication to npm with provenance
4. Check that a GitHub release was created

## Files Changed

- `.github/workflows/release.yml` - Added NPM_TOKEN environment variable
- `.releaserc.json` - Enabled provenance in npm plugin configuration
- `NPM_TRUSTED_PUBLISHER_SETUP.md` - New documentation file with setup instructions

All tests pass ✅
All linting passes ✅
No security vulnerabilities introduced ✅
