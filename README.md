# Waits for expected HTTP response

[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

`waitehr` (wait [for] expected HTTP response) is a CLI program that waits for HTTP response and retries request until the expected response is received.

## Install

```bash
npm install waitehr --global
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

Options:
  --help          Show help                                            [boolean]
  --version       Show version number                                  [boolean]
  --contains      Expected string(s). If multiple strings are provided, then all
                  of them must be contained in the response.             [array]
  --interval      How many seconds to sleep between every attempt.
                                                           [number] [default: 1]
  --status-codes  Expected status code(s). If multiple status codes are
                  provided, then either will be accepted as valid.
                                                        [array] [default: "200"]
  --timeout       How many seconds to wait before giving up.       [default: 60]
```

## Alternatives

* [check_http](https://www.monitoring-plugins.org/doc/man/check_http.html) – Nagios plugin with equivalent functionality.
* [httping](https://www.vanheusden.com/httping/) – utility for measuring latency and throughput of a webserver with limited some assertion capabilities.