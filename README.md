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

Send emails to be scanned as standard HTTP file upload.

`curl -X POST -F eicar=@eicar.eml localhost:8000/scan`

Sent metadata about the connection / message as HTTP headers.

`curl -X POST -F eicar=@eicar.eml -H 'X-GeoIP: AS, CN, Fuzhou' -H 'X-Remote-IP: 27.150.160.26' localhost:8000/scan`

## Response

The response is a JSON encoded array, with the request and response for
each available scanner.

```json
[
    {
        "name":"clamav",
        "pass":[],
        "fail":["Eicar-Test-Signature"],
        "error":[],
        "raw":"/Users/matt/Documents/git/ess/spool/upload_9f8c482aaaa10fcf501bf5259c00746c.eml: Eicar-Test-Signature FOUND\n"
    },
    {
        "name":"spamassassin",
        "pass":["ham"],
        "fail":[],
        "raw":"SPAMD/1.1 0
EX_OK\r\nContent-length: 62\r\nSpam: False ; 2.3 /
5.0\r\n\r\nAPOSTROPHE_FROM,MISSING_DATE,MISSING_MID,NO_RECEIVED,NO_RELAYS","error":[]},{"pass":["5646b98f634915112796250"],"fail":[],"name":"dspam","raw":"X-DSPAM-Result:
matt; result=\"Innocent\"; class=\"Whitelisted\"; probability=0.0000; confidence=0.99; signature=5646b98f634915112796250\n",
        "error":[]
    },
    {
        "name":"opendkim",
        "pass":[],
        "fail":["message not signed"],
        "raw":"opendkim: /Users/matt/Documents/git/ess/spool/upload_9f8c482aaaa10fcf501bf5259c00746c.eml: message not signed\n",
        "error":[]
    }
]
```

### Status Page

![status page image](https://cloud.githubusercontent.com/assets/261635/11162087/56acf54a-8a46-11e5-882c-5d8b5a704d71.png)

[ci-img]: https://github.com/cloud-ecs/ecsd/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/cloud-ecs/ecsd/actions/workflows/ci.yml
[cov-img]: https://codecov.io/github/cloud-ecs/ecsd/coverage.svg
[cov-url]: https://codecov.io/github/cloud-ecs/ecsd
[qlty-img]: https://qlty.sh/gh/cloud-ecs/projects/ecsd/maintainability.svg
[qlty-url]: https://qlty.sh/gh/cloud-ecs/projects/ecsd
