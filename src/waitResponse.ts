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
  initialDelay?: number,
  interval?: number,
  maxRedirects?: number,
  quiet?: boolean,
  statusCodes?: number[],
  successThreshold?: number,
  timeout?: number,
};

type Configuration = {
  contains: string[],
  followRedirect: boolean,
  initialDelay: number,
  interval: number,
  maxRedirects: number,
  quiet: boolean,
  statusCodes: number[],
  successThreshold: number,
  timeout: number,
};

const isExpectedResponse = (quiet: boolean, response: Response<string>, configuration: Configuration): boolean => {
  const {
    contains,
    statusCodes,
  } = configuration;

  for (const needle of contains) {
    if (!response.body.includes(needle)) {
      if (!quiet) {
        console.warn(chalk.red('[failed check]') + ' missing required snippet ("%s")', needle);
      }

      return false;
    }
  }

  if (!statusCodes.includes(response.statusCode)) {
    if (!quiet) {
      console.warn(chalk.red('[failed check]') + ' status code is not among expected status codes (%s)', statusCodes.join(', '));
    }

    return false;
  }

  return true;
};

export const waitResponse = async (url: string, configurationInput: ConfigurationInput): Promise<boolean> => {
  if (!url) {
    console.error('URL must not be empty');

    return false;
  }

  const configuration = {
    contains: [],
    followRedirect: true,
    initialDelay: 0,
    interval: 1_000,
    maxRedirects: 5,
    quiet: true,
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
    interval,
    quiet,
    successThreshold,
    initialDelay,
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
        console.log(chalk.red('reached timeout'));
      }

      break;
    }

    const request = got(url, {
      followRedirect,
      maxRedirects,
      throwHttpErrors: false,
    });

    currentRequest = request;

    let response;

    try {
      response = await request;
    } catch (error) {
      if (currentRequest.isCanceled) {
        return false;
      }

      if (!quiet) {
        console.log(chalk.red('[failed request]') + ' ' + error.message);
      }
    }

    if (response) {
      if (!quiet) {
        console.log(chalk.yellow('[received response]') + ' %d', response.statusCode);
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
