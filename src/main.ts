import yargs from 'yargs';
import {
  hideBin,
} from 'yargs/helpers';
import {
  waitResponse,
} from './waitResponse';

const argv = yargs(hideBin(process.argv))
  .usage('$0 <url> [options]')
  .options({
    contains: {
      description: 'Expected string(s). If multiple strings are provided, then all of them must be contained in the response.',
      type: 'array',
    },
    interval: {
      coerce: (value) => {
        return value * 1_000;
      },
      default: 1,
      description: 'How many seconds to sleep between every attempt.',
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
    process.exit(0);
  });
