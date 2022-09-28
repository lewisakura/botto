import { CommandContext } from '../../types';
import axios from 'axios';

async function exec(ctx: CommandContext) {
    const sortBy = ctx.args.length >= 1 ? ctx.args[0] : 'kills';

    const sort = sortBy === 'kills' || sortBy === 'souls' ? sortBy : 'kills';

    const leaderboardData = (
        await axios.get<any[]>('https://zo.lewistehminerz.dev/leaderboard?top=10&format=json&sort=' + sort)
    ).data;

    const top10 = leaderboardData
        .map((u, idx) => `**\`${(++idx).toString().padStart(2, ' ')} |\`** ${u.name} - ${u[sort].toLocaleString()}`)
        .join('\n');

    return ctx.reply(`**Top 10 Players | ${sort.charAt(0).toUpperCase() + sort.slice(1)}**\n\n${top10}`);
}

export default {
    name: 'leaderboard',
    description: 'See the top 10 players from the ZOぞ leaderboard.',
    usage: '<sortBy(1)? = kills>',

    exec,
    level: 0
};
