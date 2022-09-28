import * as usernameClassifier from './src/usernameClassifier';
import axios from 'axios';
import { promises as fs } from 'fs';

const target = 5000;
const usernames: string[] = [];

async function scrape(cursor?: string) {
    const data = (
        await axios.get('https://groups.roblox.com/v1/groups/10378847/users?limit=100&cursor=' + (cursor || ''))
    ).data;
    for (const user of data.data.map((obj: { user: any }) => obj.user)) {
        usernames.push(user.username);
    }

    console.log(usernames.length);

    if (usernames.length < target) {
        await scrape(data.nextPageCursor);
    }
}

if (false) {
    (async () => {
        await scrape();
        await fs.writeFile('./usernames.txt', usernames.join('\n'));
    })();
} else {
    const testCases: [username: string, expectedResult: string | null][] = [
        ['LewisTehMinerz', null],
        ['TamperedReality', null],
        ['Haladesh', null],
        ['56kJxsonn', null],
        ['fhjsdgtjghj', 'random'],
        ['caloylang_pogi', null],
        ['SzaciuxYT15', null],
        ['morgan_1438', null],
        ['HanakokunLove123', null],
        ['Kazuya_Kazuya', null],
        ['sdf9tyui8o7', 'random'],
        ['xXvoladxX', null],
        ['popitapoooo', null],
        ['16nPre9nant', null],
        ['Q6VFXLM', 'random'],
        ['5o12e2oovn', 'random'],
        ['1463uu30c1', 'random'],
        ['mvpkyo6gp8', 'random'],
        ['0os1w3h45t', 'random'],
        ['n5yk50mb2i', 'random'],
        ['IlIIllIlIlllIl', 'barcode']
    ];

    for (const testCase of testCases) {
        const [username, expected] = testCase;
        const actual = usernameClassifier.test(username);
        if (actual === expected) {
            console.log('✅', username, actual);
        } else {
            console.log('❌', username, actual);
        }
    }
}
