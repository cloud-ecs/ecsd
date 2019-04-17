[![Build Status][ci-img]][ci-url]
[![Code Coverage][cov-img]][cov-url]
[![Code Climate][clim-img]][clim-url]

# Cloud Email Scanner Server

A web service that receives emails via HTTP and scans them with one or many filtering engines (antivirus, antispam, policy engines, etc.)

## Content Scanners

- [x] spamassassin
- [x] rspamd
- [x] dspam
- [ ] messagesniffer
- [ ] dcc
- [ ] virustotal
- [ ] fprot
- [ ] f-secure
- [x] clamav
- [ ] avg
- [ ] eset
- [ ] kaspersky
- [ ] comodo
- [x] bitdefender
- [x] opendkim
- [ ] opendmarc

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


[ci-img]: https://travis-ci.org/cloud-ecs/ecsd.svg
[ci-url]: https://travis-ci.org/cloud-ecs/ecsd
[cov-img]: https://codecov.io/github/cloud-ecs/ecsd/coverage.svg
[cov-url]: https://codecov.io/github/cloud-ecs/ecsd
[clim-img]: https://codeclimate.com/github/cloud-ecs/ecsd/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/cloud-ecs/ecsd
