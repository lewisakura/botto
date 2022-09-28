import qranode from 'qranode';
import AsyncLock from 'async-lock';

const lock = new AsyncLock();

let cachedNumbers: number[] = [];

export async function cryptoRand() {
    if (cachedNumbers.length <= 100 && !lock.isBusy('rng-cache-update')) {
        await lock.acquire('rng-cache-update', async () => {
            if (cachedNumbers.length <= 100) cachedNumbers = await qranode('uint8', 1024);
        });
    }

    return cachedNumbers.shift() / 255;
}

export async function cryptoRandRange(min: number, max: number) {
    return Math.min(Math.floor((await cryptoRand()) * (max + 1 - min)) + min, max);
}
