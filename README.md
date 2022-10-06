# Waits for expected HTTP response

[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

`waitehr` (wait [for] expected HTTP response) is a CLI program that waits for HTTP response and retries request until the expected response is received.

## Motivation

We needed a reliable utility for checking when a deployment goes live in a CI/CD pipeline.

### Why not just use Bash/curl/...?

> You should be able to do this with curl and a simple bash script.

You could achieve something similar to this with bash:

```bash
while curl https://gajus.com/ | grep -q Gajus; do sleep 1; done
```

However, by the time you add:

* routine timeout
* request timeout
* follow redirects
* max redirects
* success threshold

It is going to be a pretty hefty script, and if everyone (with their varying experience of using Bash) were to write that script adhoc, it is likely to be error prone. It is for this reason that it makes sense to use a well tested utility that does it well.

## Install

```bash
npm install waitehr --global
```

## Run with Docker

```bash
docker build . -t waitehr:latest
docker run waitehr:latest --help
```

## Usage

```bash
waitehr <url> [options]

# Waits for response with status code 200.
waitehr https://gajus.com/

# Retries request at most once every 5 seconds (default: 1).
waitehr https://gajus.com/ --interval 5

# Waits at most 120 seconds (default: 60).
waitehr https://gajus.com/ --timeout 60

# Waits for response with status code 200 or 404.
waitehr https://gajus.com/ --status-code 200 404

# Waits for response that contains "foo" and "bar".
waitehr https://gajus.com/ --contains "foo" "bar"

# Sends headers with the request if required to receive a valid response
waitehr https://gajus.com/ --headers "Accepts: text/html" "Authorization: Bearer fkd9afsda9k"

Options:
  --help               Show help                                       [boolean]
  --version            Show version number                             [boolean]
  --contains           Expected string(s). If multiple strings are provided,
                       then all of them must be contained in the response.
                                                                         [array]
  --follow-redirect    Defines if redirect responses should be followed
                       automatically.                                  [boolean]
  --initial-delay      How many seconds to delay the first request.
                                                           [number] [default: 0]
  --interval           How many seconds to sleep between every attempt.
                                                           [number] [default: 1]
  --max-redirects      If exceeded, the request will be aborted.
                                                           [number] [default: 5]
  --quiet              Disables any output.           [boolean] [default: false]
  --request-timeout    How many seconds to wait for individual requests to
                       complete. If exceeded, requests are aborted and a new
                       request is started.                 [number] [default: 5]
  --status-codes       Expected status code(s). If multiple status codes are
                       provided, then either will be accepted as valid.
                                                        [array] [default: "200"]
  --success-threshold  Minimum consecutive successes for the probe to be
                       considered successful.              [number] [default: 1]
  --timeout            How many seconds to wait before giving up.  [default: 60]
  --headers            String request headers in the format
                       <Header Key>: <Header Value>.
                                                                   [array]
```

## Alternatives

* [check_http](https://www.monitoring-plugins.org/doc/man/check_http.html) – Nagios plugin with equivalent functionality.
* [httping](https://www.vanheusden.com/httping/) – utility for measuring latency and throughput of a webserver with limited some assertion capabilities.
