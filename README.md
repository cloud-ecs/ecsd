[![Build Status][ci-img]][ci-url]
[![Coverage Status][cov-img]][cov-url]
[![Code Climate][clim-img]][clim-url]

# Cloud Email Scanner Server

A web service that receives emails via HTTP and scans them with one or many filtering engines (antivirus, antispam, policy engines, etc.)

# API

## Request

Send emails to be scanned as standard HTTP file upload.

`curl -X POST -F eicar=@eicar.eml localhost:8000/scan`

Sent metadata about the connection / message as HTTP headers.

`curl -X POST -F eicar=@eicar.eml -H 'X-GeoIP: AS, CN, Fuzhou' -H 'X-Remote-IP: 27.150.160.26' localhost:8000/scan`

## Response

The response will be a JSON encoded array, with the request and response for
each available scanner. 


[ci-img]: https://travis-ci.org/cloud-css/ess.svg
[ci-url]: https://travis-ci.org/cloud-css/ess
[cov-img]: https://coveralls.io/repos/cloud-css/ess/badge.svg
[cov-url]: https://coveralls.io/github/cloud-css/ess
[clim-img]: https://codeclimate.com/github/cloud-css/ess/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/cloud-css/ess
