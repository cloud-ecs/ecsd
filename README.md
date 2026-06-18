# Email Content Scanning Daemon

[![Build][ci-img]][ci-url] [![Cover][cov-img]][cov-url] [![Qlty][qlty-img]][qlty-url]

A web service that receives emails via HTTP and scans them with one or many filtering engines (antivirus, antispam, policy engines, etc.)

## Content Scanners

- [x] [spamassassin](https://spamassassin.apache.org)
- [x] [rspamd](https://rspamd.com)
- [x] [dcc](https://www.dcc-servers.net/dcc/)
- [x] [virustotal](https://www.virustotal.com)
- [x] [clamav](https://www.clamav.net)
- [x] [bitdefender](https://www.bitdefender.com/business/antivirus.html)
- [x] [opendkim](http://www.opendkim.org)
- [ ] [opendmarc](http://www.opendmarc.org)

### Viable?

- [ ] fprot
- [ ] f-secure
- [ ] eset
- [ ] kaspersky
- [ ] comodo

### Legacy / Deprecated Scanners

- [x] dspam
- [ ] messagesniffer
- [ ] avg

# API

## Request

Send a message to be scanned as a standard HTTP file upload. The form field
name is ignored — the first uploaded file is scanned.

```sh
curl -X POST -F upload=@test/files/eicar.eml localhost:8000/scan
```

## Response

The response is a JSON array with one entry per available scanner. Each entry
reports `pass`, `fail`, and `error` lists alongside the engine's `raw` output;
a non-empty `fail` means that engine flagged the message.

The example below is a real scan of the bundled EICAR test message, with `raw`
trimmed for brevity.

```json
[
  {
    "name": "clamav",
    "pass": [],
    "fail": ["Eicar-Signature"],
    "error": [],
    "raw": "stream: Eicar-Signature FOUND"
  },
  {
    "name": "virustotal",
    "pass": [],
    "fail": [41],
    "error": []
  },
  {
    "name": "spamassassin",
    "pass": ["ham"],
    "fail": [],
    "error": []
  },
  {
    "name": "rspamd",
    "pass": [],
    "fail": [8.5],
    "error": []
  },
  {
    "name": "dcc",
    "pass": ["A"],
    "fail": [],
    "error": [],
    "raw": "A\nA\nX-DCC-...; bulk rep Body=3 Fuz1=3 Fuz2=3 rep=23%\n\n"
  },
  {
    "name": "opendkim",
    "pass": [],
    "fail": ["message not signed"],
    "error": []
  }
]
```

## Status

The daemon serves a small web UI (Home, Status, Scan) on the configured listen
port, backed by two JSON endpoints:

- `GET /status/scannersAll` — every known scanner
- `GET /status/scannersAvailable` — scanners currently reachable, and the
  interface (`cli`, `socket`, or `network`) each was detected on

[ci-img]: https://github.com/cloud-ecs/ecsd/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/cloud-ecs/ecsd/actions/workflows/ci.yml
[cov-img]: https://codecov.io/github/cloud-ecs/ecsd/coverage.svg
[cov-url]: https://codecov.io/github/cloud-ecs/ecsd
[qlty-img]: https://qlty.sh/gh/cloud-ecs/projects/ecsd/maintainability.svg
[qlty-url]: https://qlty.sh/gh/cloud-ecs/projects/ecsd
