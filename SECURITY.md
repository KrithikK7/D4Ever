# Security Policy

## Reporting a Vulnerability

Please email security reports to `security@kdramajournal.local` (replace with your organisation’s preferred alias). Provide as much detail as possible so we can reproduce the issue quickly. You can also open a private advisory via the GitHub “Security” tab if you prefer staying on-platform.

We aim to triage new reports within **2 business days** and will keep you updated on remediation progress. For critical issues we will coordinate a responsible disclosure timeline together with you.

## Supported Versions

Only the latest commit on the `main` branch receives security fixes. Please rebase custom deployments regularly to pick up patches.

## Guidelines for Researchers

- Please avoid accessing or modifying data that does not belong to you.
- Never run automated scanners against production deployments without prior written approval.
- If you discover exposed credentials (for example, in accidental commits), do not reuse them—report the finding immediately so we can rotate the secrets.
- Give us a reasonable amount of time to fix the issue before making any public disclosure.
