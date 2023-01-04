#!/usr/bin/env node

// eslint-disable-next-line node/shebang
import yargs from 'yargs';
import {
  hideBin,
} from 'yargs/helpers';
import {
  waitResponse,
} from './waitResponse';

const usage = `$0 <url> [options]

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

# Waits for response that has a specific header.
waitehr https://gajus.com/ --has-header "foo: bar"

# Adds custom headers to the request.
waitehr https://gajus.com/ --header "Accepts: text/html" "Authorization: Bearer fkd9afsda9k"
`;

const argv = yargs(hideBin(process.argv))
  .usage(usage)
  .parserConfiguration({
    'parse-numbers': false,
  })
  .options({
    contains: {
      description: 'Expected string(s). If multiple strings are provided, then all of them must be contained in the response.',
      type: 'array',
    },
    'follow-redirect': {
      description: 'Defines if redirect responses should be followed automatically.',
      type: 'boolean',
    },
    'has-header': {
      description: 'Expected header(s). If multiple headers are provided, then all of them must be contained in the response.',
      type: 'array',
    },
    header: {
      description: 'Extra header to include in the request when sending HTTP to a server. <Header Key>: <Header Value>.',
      type: 'array',
    },
    'initial-delay': {
      coerce: (value) => {
        return value * 1_000;
      },
      default: 0,
      description: 'How many seconds to delay the first request.',
      type: 'number',
    },
    interval: {
      coerce: (value) => {
        return value * 1_000;
      },
      default: 1,
      description: 'How many seconds to sleep between every attempt.',
      type: 'number',
    },
    'max-redirects': {
      default: 5,
      description: 'If exceeded, the request will be aborted.',
      type: 'number',
    },
    'prepend-time': {
      default: true,
      description: 'Prepends time to each check output.',
      type: 'boolean',
    },
    quiet: {
      default: false,
      description: 'Disables any output.',
      type: 'boolean',
    },
    'request-timeout': {
      coerce: (value) => {
        return value * 1_000;
      },
      default: 5,
      description: 'How many seconds to wait for individual requests to complete. If exceeded, requests are aborted and a new request is started.',
      type: 'number',
    },
    'status-codes': {
      coerce: (values) => {
        return values.map((value) => {
          return Number.parseInt(value, 10);
        });
      },
      default: '200',
      description: 'Expected status code(s). If multiple status codes are provided, then either will be accepted as valid.',
      type: 'array',
    },
    'success-threshold': {
      default: 1,
      description: 'Minimum consecutive successes for the probe to be considered successful.',
      type: 'number',
    },
    timeout: {
      coerce: (value) => {
        return value * 1_000;
      },
      default: 60,
      description: 'How many seconds to wait before giving up.',
    },
  })
  .parseSync();

waitResponse(argv._[0] ?? '', argv)
  .then((success) => {
    // eslint-disable-next-line node/no-process-exit
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);

    // eslint-disable-next-line node/no-process-exit
    process.exit(1);
  });
