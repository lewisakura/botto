import _ from 'lodash';
import fs from 'fs';

const acceptedCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
const positions: { [key: string]: number } = {};

const goodUsernames = [
    'LewisTehMinerz',
    'TamperedReality',
    'LianNotFound29',
    'songo345600',
    'felixssillver111',
    'jwtan_baigsin5',
    'Zt_rF',
    'CastlersEZ',
    'EthanGamer_YTCP',
    'DC_BruceWaynee',
    'SopennS',
    'b1nkster'
];
const badUsernames = ['x4dTqZi70P', '2SeoKgoV7T', 't3iqjz9xh', 'r83jg9q2lxl'];
const unclassifiedUsernames = fs
    .readFileSync('./resources/usernames.txt', 'utf-8')
    .split('\n')
    .filter(username => !goodUsernames.includes(username) && !badUsernames.includes(username));

for (const char of acceptedCharacters) {
    positions[char] = acceptedCharacters.indexOf(char);
}

// ported from https://github.com/rrenaud/Gibberish-Detector/blob/master/gib_detect_train.py

function normalize(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ngrams(l: string, n: number): string[] {
    const normalized = normalize(l);
    const ngrams = [];
    for (let i = 0; i < normalized.length - n + 1; i++) {
        ngrams.push(normalized.substr(i, n));
    }
    return ngrams;
}

function avgTransitionProb(l: string, logProbMat: number[][]): number {
    let logProb = 0;
    let transitionCt = 0;

    for (const [a, b] of ngrams(l, 2)) {
        logProb += logProbMat[positions[a]][positions[b]];
        transitionCt++;
    }

    return Math.exp(logProb / (transitionCt || 1));
}

function train() {
    const k = 26 + 26 + 10; // lowercase + uppercase + digits

    const counts: number[][] = [];

    for (let i = 0; i < k; i++) {
        counts[i] = [];
        for (let j = 0; j < k; j++) {
            counts[i][j] = 10;
        }
    }

    for (const username of [...goodUsernames, ...badUsernames, ...unclassifiedUsernames]) {
        for (const [a, b] of ngrams(username, 2)) {
            counts[positions[a]][positions[b]]++;
        }
    }

    for (const row of counts) {
        const s = _.sum(row);

        for (let i = 0; i < row.length; i++) {
            row[i] = Math.log(row[i] / s);
        }
    }

    const goodProbs = [];
    const badProbs = [];

    for (const username of goodUsernames) {
        goodProbs.push(avgTransitionProb(username, counts));
    }

    for (const username of badUsernames) {
        badProbs.push(avgTransitionProb(username, counts));
    }

    if (!(Math.min(...goodProbs) > Math.max(...badProbs))) {
        throw new Error(
            'Not enough good probabilities to determine bad probabilities (' +
                Math.min(...goodProbs) +
                ' vs ' +
                Math.max(...badProbs) +
                ')'
        );
    }

    const threshold = (Math.min(...goodProbs) + Math.max(...badProbs)) / 2;

    return {
        mat: counts,
        threshold
    };
}

let currentModel = train();

export function test(username: string) {
    if (username.toLowerCase().split('').filter(char => !['i', 'l', '1'].includes(char)).length === 0) {
        return 'barcode';
    }

    if (avgTransitionProb(username, currentModel.mat) <= currentModel.threshold) {
        return 'random';
    }

    return null;
}

export function addGoodUsername(username: string) {
    if (!goodUsernames.includes(username)) {
        goodUsernames.push(username);
        currentModel = train();
    }
}

export function addBadUsername(username: string) {
    if (!badUsernames.includes(username)) {
        badUsernames.push(username);
        currentModel = train();
    }
}
