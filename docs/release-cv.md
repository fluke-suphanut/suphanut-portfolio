# Release the CV and resume PDFs

`npm run release:cv` puts the CV and resume PDFs on the live site only when each file is byte-identical to the file QA approved. QA records each approval in an approval file. The script reads that file and compares sha256 hashes 4 times: in the source folder, in `public/`, in `out-public/`, and on the live site after the deploy.

## Approval file

QA writes one JSON file. Pass its path with `--approved <file>` or the `PORTFOLIO_APPROVED` environment variable. Keep the file outside this repository.

```json
{
  "schema": 1,
  "files": {
    "Suphanut-Meeyindee-CV.pdf": {
      "sha256": "<64 lowercase hex characters>",
      "approved_by": "qa-engineer",
      "approved_on": "2026-11-27",
      "gate": "qa/cv-update-2026-11-27.md#round-6"
    },
    "Suphanut-Meeyindee-Resume.pdf": {
      "sha256": "<64 lowercase hex characters>",
      "approved_by": "qa-engineer",
      "approved_on": "2026-11-27",
      "gate": "qa/cv-update-2026-11-27.md#round-6"
    }
  }
}
```

| Field | Required | Rule |
|---|---|---|
| `schema` | yes | `1` |
| `files.<name>` | yes, for every file in [`lib/downloads.json`](../lib/downloads.json) | The key is the file name on the site. The script ignores other keys. |
| `sha256` | yes | The hash of the exact file QA passed, in lowercase hex |
| `approved_by` | yes | The role that approved the file |
| `approved_on` | yes | `YYYY-MM-DD` |
| `gate` | no | Where the QA result is written. The script does not read it. |

When QA approves a new file, QA replaces its entry. A file that is not approved has no entry, so the release stops.

## Run it

```bash
export DATABASE_URL="postgres://localhost:5432/portfolio"
export CLOUDFLARE_API_TOKEN=...            # from your secret store, never from a file in the repo
npm run release:cv -- <folder-with-the-pdfs> --approved <approval-file>
npm run check:pages -- https://suphanut.pages.dev --public
```

The release runs these steps and stops at the first failure:

1. It checks the settings and the approval file. A problem here exits with code 2, before the script reads any PDF.
2. It hashes the PDFs in the source folder. If any PDF does not match, the script exits with code 1 and copies nothing.
3. It copies the PDFs into `public/` and checks the copies.
4. It runs `npm run build:public` and checks the PDFs in `out-public/`.
5. It deploys `out-public/` to Cloudflare Pages.
6. It checks that the live home page links each PDF. Then it downloads each PDF from the live site and compares the hashes. It retries up to 5 times, 3 seconds apart, while the new deployment propagates.

Other modes:

- `--no-deploy` stops after step 4. Use it to check a release without publishing it.
- `--verify-live` runs step 6 only. Use it to confirm what the live site serves now. It needs no folder, database, or token.
- `--base <url>` checks another address, such as a preview deployment. `--project <name>` deploys to another Pages project.

Exit codes: `0` means every check passed, `1` means a hash or a live check failed, and `2` means an argument, a setting, or the approval file is wrong.

## Tests

```bash
npm run test:scripts
```

The tests run the real script against temporary files and a local HTTP server. They never touch the live site, the database, or Cloudflare.
