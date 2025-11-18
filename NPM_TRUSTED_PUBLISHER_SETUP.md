# npm Trusted Publisher Setup Guide

This repository uses npm's **Trusted Publishing** with OpenID Connect (OIDC) for automated, secure package publishing without long-lived tokens.

## Current Status

✅ GitHub Actions workflow configured with OIDC support
✅ Package publishing access set to "Require two-factor authentication and disallow tokens"
❌ **Trusted publisher relationship NOT configured on npmjs.org** (this is causing the current failure)

## Required Setup Steps

To fix the publishing failure, the package owner needs to configure the trusted publisher relationship on npmjs.org:

### 1. Configure Trusted Publisher on npm

1. Go to https://www.npmjs.com/package/@asup/context-menu/access
2. Scroll to the **"Trusted Publisher"** section
3. Click **"Edit"** or **"Add"** next to "Establish a trust between your package and your repository using OpenID Connect (OIDC)"
4. Fill in the following details:
   - **Repository owner**: `PaulDThomas`
   - **Repository name**: `context-menu`
   - **Workflow file**: `release.yml`
   - **Environment** (optional): Leave blank or enter environment name if using GitHub Environments

5. Click **"Save"** or **"Add publisher"**

### 2. Verify Configuration

After configuring the trusted publisher:

1. The workflow will automatically use OIDC authentication
2. No NPM_TOKEN secret is required in GitHub
3. Each publish will include cryptographic provenance attestations

### 3. Test the Setup

To test the configuration:

1. Make a commit to the `master` branch with a semantic commit message:

   ```bash
   git commit -m "fix: test trusted publishing setup"
   git push origin master
   ```

2. The GitHub Actions workflow will automatically:
   - Run tests and linting
   - Use OIDC to authenticate with npm
   - Publish the package with provenance
   - Create a GitHub release

## Benefits of Trusted Publishing

- 🔒 **More Secure**: No long-lived tokens to manage or leak
- ✅ **Supply Chain Security**: Automatic provenance attestations
- 🎯 **Simpler**: No manual token rotation needed
- 🔍 **Transparent**: Provenance shows exactly where packages came from

## Troubleshooting

### Error: "404 OIDC token exchange error - package not found"

This means the trusted publisher relationship hasn't been configured on npmjs.org yet. Follow the setup steps above.

### Error: "401 Unauthorized"

If you see this error after OIDC fails:

- The workflow falls back to token authentication
- Since tokens are disallowed, this will always fail
- Complete the trusted publisher setup to fix this

## Alternative: Using NPM_TOKEN (Not Recommended)

If you prefer to use traditional token authentication instead of OIDC:

1. Change package access settings to allow tokens (less secure)
2. Generate an automation token at https://www.npmjs.com/settings/tokens
3. Add it as `NPM_TOKEN` secret in GitHub repository settings
4. The workflow already passes this to semantic-release

However, **trusted publishing is recommended** for better security and supply chain integrity.

## References

- [npm Trusted Publishers Documentation](https://docs.npmjs.com/trusted-publishers)
- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [@semantic-release/npm Documentation](https://github.com/semantic-release/npm#npm-provenance)
