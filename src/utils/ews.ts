import type { Member, OldMember } from 'eris';

export const ews = [
    {
        on: 'update',
        sendIf: (m: Member, oldM: OldMember) => {
            const searchFor = 'verrater';
            return m.nick !== null && m.nick.toLowerCase().slice(-searchFor.length) === searchFor && m.nick !== oldM.nick;
        },
        message: (m: Member) => `${m.mention} (${m.id}) nickname is ${m.nick}, possible Verrater? Please investigate.`
    }
];