import {
  setTimeout as delay,
} from 'node:timers/promises';
import chalk from 'chalk';
import got, {
  type Response,
} from 'got';

type ConfigurationInput = {
  contains?: string[],
  followRedirect?: boolean,
  hasHeader?: string[],
  header?: string[],
  initialDelay?: number,
  interval?: number,
  maxRedirects?: number,
  prependTime?: boolean,
  quiet?: boolean,
  requestTimeout?: number,
  statusCodes?: number[],
  successThreshold?: number,
  timeout?: number,
};

type Configuration = {
  contains: string[],
  followRedirect: boolean,
  hasHeader: string[],
  header: string[],
  initialDelay: number,
  interval: number,
  maxRedirects: number,
  prependTime: boolean,
  quiet: boolean,
  requestTimeout: number,
  statusCodes: number[],
  successThreshold: number,
  timeout: number,
};

const conditionallyPrependTime = (subject: string, prependTime: boolean): string => {
  if (prependTime) {
    return `[${new Date().toISOString()}] ${subject}`;
  }

  return subject;
};

export const buildHeadersObject = (headers: string[]): Record<string, string> => {
  const headersObject = {
    'user-agent': 'waitehr',
  };

  for (const header of headers) {
    const [
      name,
      value,
    ] = header.split(':');

    headersObject[name] = value.trim();
  }

  return headersObject;
};

const isExpectedResponse = (
  quiet: boolean,
  response: Response<string>,
  configuration: Configuration,
): boolean => {
  const {
    contains,
    hasHeader: hasHeaders,
    statusCodes,
  } = configuration;

  for (const targetHeader of hasHeaders) {
    const [
      name,
      value,
    ] = targetHeader.split(': ');

    if (!response.headers[name]) {
      if (!quiet) {
        console.warn(
          conditionallyPrependTime(chalk.red('[failed check]') + ' missing required header ("%s")', configuration.prependTime),
          name,
        );
      }

      return false;
    }

    if (response.headers[name] !== value) {
      if (!quiet) {
        console.warn(
          conditionallyPrependTime(chalk.red('[failed check]') + ' header values do not match (header: "%s", expected: "%s", actual: "%s")', configuration.prependTime),
          name,
          value,
          response.headers[name],
        );
      }

      return false;
    }
  }

  for (const needle of contains) {
    if (!response.body.includes(needle)) {
      if (!quiet) {
        console.warn(
          conditionallyPrependTime(chalk.red('[failed check]') + ' missing required snippet ("%s")', configuration.prependTime),
          needle,
        );
      }

      return false;
    }
  }

  if (!statusCodes.includes(response.statusCode)) {
    if (!quiet) {
      console.warn(
        conditionallyPrependTime(chalk.red('[failed check]') +
          ' status code is not among expected status codes (%s)', configuration.prependTime),
        statusCodes.join(', '),
      );
    }

    return false;
  }

  return true;
};

export const waitResponse = async (
  url: string,
  configurationInput: ConfigurationInput,
): Promise<boolean> => {
  if (!url) {
    console.error(chalk.red('[configuration error]') + ' URL must not be empty');

    return false;
  }

  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    console.error(chalk.red('[configuration error]') + ' invalid URL "%s"', url);

    return false;
  }

  const configuration = {
    contains: [],
    followRedirect: true,
    hasHeader: [],
    header: [],
    initialDelay: 0,
    interval: 1_000,
    maxRedirects: 5,
    prependTime: true,
    quiet: false,
    requestTimeout: 60_000,
    statusCodes: [
      200,
    ],
    successThreshold: 1,
    timeout: 60_000,
    ...configurationInput,
  };

  const {
    followRedirect,
    maxRedirects,
    timeout,
    header,
    interval,
    quiet,
    successThreshold,
    initialDelay,
    requestTimeout,
  } = configuration;

  if (successThreshold < 1) {
    if (!quiet) {
      console.error('successThreshold must be greater than 0');
    }

    return false;
  }

  if (initialDelay) {
    await delay(initialDelay);
  }

  let currentRequest;

  const startTime = Date.now();

  const timeoutId = setTimeout(() => {
    if (currentRequest) {
      currentRequest.cancel();
    }
  }, timeout).unref();

  let consecutiveSuccesses = 0;

  while (true) {
    const attemptStartTime = Date.now();

    if (attemptStartTime - startTime > timeout) {
      if (!quiet) {
        console.log(conditionallyPrependTime(chalk.red('reached timeout'), configuration.prependTime));
      }

      break;
    }

    const request = got(url, {
      followRedirect,
      headers: buildHeadersObject(header),
      maxRedirects,
      throwHttpErrors: false,
    });

    // got `timeout` setting is unreliable – it takes
    // a lot longer than whatever the timeout value.
    const requestTimeoutId = setTimeout(() => {
      if (!quiet) {
        console.log(conditionallyPrependTime(chalk.red('[failed request]') + ' request timeout', configuration.prependTime));
      }

      request.cancel();
    }, requestTimeout).unref();

    currentRequest = request;

    let response;

    try {
      response = await request;

      clearTimeout(requestTimeoutId);
    } catch (error) {
      clearTimeout(requestTimeoutId);

      if (currentRequest.isCanceled) {
        if (attemptStartTime - startTime > timeout) {
          return false;
        }
      } else if (!quiet) {
        console.log(conditionallyPrependTime(chalk.red('[failed request]') + ' ' + error.message, configuration.prependTime));
      }
    }

    if (response) {
      if (!quiet) {
        console.log(
          conditionallyPrependTime(chalk.yellow('[received response]') + ' %d', configuration.prependTime),
          response.statusCode,
        );
      }

      if (isExpectedResponse(quiet, response, configuration)) {
        consecutiveSuccesses++;

        if (successThreshold === consecutiveSuccesses) {
          clearTimeout(timeoutId);

          if (!quiet) {
            console.log(chalk.green('received expected response'));
          }

          return true;
        }
      } else {
        consecutiveSuccesses = 0;
      }
    } else {
      consecutiveSuccesses = 0;
    }

    const attemptEndTime = Date.now();
    const attemptDuration = attemptEndTime - attemptStartTime;
    const delayTime = Math.max(0, interval - attemptDuration);

    if (delayTime > 0) {
      await delay(delayTime);
    }
  }

  return false;
};
