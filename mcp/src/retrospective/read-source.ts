import fs from "node:fs";
import type { Stats } from "node:fs";
import { promisify } from "node:util";

const fstat = promisify(fs.fstat);
const read = promisify(fs.read);
const close = promisify(fs.close);

/** Narrow borrowed source used by parsers; its owner alone closes it. */
export interface ReadSource {
  stat(): Promise<Stats>;
  read(
    buffer: Buffer,
    offset: number,
    length: number,
    position: number,
  ): Promise<{ bytesRead: number; buffer: Buffer }>;
  close(): Promise<void>;
}

/** Wraps a transferred native descriptor using documented Node fs APIs. */
export function createReadSource(fd: number): ReadSource {
  let tail = Promise.resolve();
  let closing: Promise<void> | undefined;
  let isClosing = false;

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    if (isClosing) return Promise.reject(new Error("Read source is closed"));
    const result = tail.then(operation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    stat: () => enqueue(() => fstat(fd)),
    read: (buffer, offset, length, position) =>
      enqueue(() => read(fd, buffer, offset, length, position)),
    close: () => {
      if (closing) return closing;
      isClosing = true;
      closing = tail.then(() => close(fd));
      return closing;
    },
  };
}
