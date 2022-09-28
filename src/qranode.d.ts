declare module 'qranode' {
    /**
     * Get a random number from https://qrng.anu.edu.au/.
     * @param {string} type - Must be either `uint8`, `uint16`, or `hex16`. Defaults to `uint8`.
     *
     * - `uint8` - returns numbers between 0 and 255.
     *
     * - `uint16` - returns numbers between 0 and 65535.
     *
     * - `hex16` - returns hexadecimal characters between `00` and `ff`.
     * For example, if you set `blockSize` to `4`, it would return hex between `00000000` and `ffffffff`.
     *
     * @param {number} amount - The amount of numbers to get. Max array size is `1024`.
     * @param {number} blockSize - The length of each hex block. Max block size is `1024`.
     * Only used with `hex16`, if the `type` argument is different this doesn't matter.
     * @returns {number[]} - A array of numbers.
     * @async
     */
    export default function getRandomNumber(
        type?: 'uint8' | 'uint16',
        amount?: number,
        blockSize?: number
    ): Promise<number[]>;

    /**
     * Get a random number from https://qrng.anu.edu.au/.
     * @param {string} type - Must be either `uint8`, `uint16`, or `hex16`. Defaults to `uint8`.
     *
     * - `uint8` - returns numbers between 0 and 255.
     *
     * - `uint16` - returns numbers between 0 and 65535.
     *
     * - `hex16` - returns hexadecimal characters between `00` and `ff`.
     * For example, if you set `blockSize` to `4`, it would return hex between `00000000` and `ffffffff`.
     *
     * @param {number} amount - The amount of numbers to get. Max array size is `1024`.
     * @param {number} blockSize - The length of each hex block. Max block size is `1024`.
     * Only used with `hex16`, if the `type` argument is different this doesn't matter.
     * @returns {string[]} - An array of hexadecimal strings.
     * @async
     */
    export default function getRandomNumber(type: 'hex16', amount?: number, blockSize?: number): Promise<string[]>;
}
