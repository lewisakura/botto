const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');

const oldDb = require('./db.json');
const db = new PrismaClient();

(async () => {
    let exploitLogs = [];

    console.log('gathering exploit logs');
    for (const [userId, logs] of Object.entries(oldDb.exploitLogs)) {
        for (const log of logs) {
            exploitLogs.push(
                db.exploitLog.create({
                    data: {
                        username: log.username,
                        reason: log.reason,
                        severity: log.severity,
                        at: dayjs(log.at * 1000).toDate(),
                        user: {
                            connectOrCreate: {
                                where: {
                                    id: userId
                                },
                                create: {
                                    id: userId
                                }
                            }
                        }
                    }
                })
            );
        }
    }

    await db.$transaction(exploitLogs);

    console.log('gathering ban logs');
    let banLogs = [];
    for (const [userId, logs] of Object.entries(oldDb.banLogs)) {
        for (const log of logs) {
            if (log.reason.inline) continue; // corrupted ban log

            banLogs.push(
                db.banLog.create({
                    data: {
                        username: log.username,
                        actor: log.actor,
                        reason: log.reason,
                        tempban: log.tempban || false,
                        user: {
                            connectOrCreate: {
                                where: {
                                    id: userId
                                },
                                create: {
                                    id: userId
                                }
                            }
                        }
                    }
                })
            );
        }
    }

    await db.$transaction(banLogs);

    console.log('done!');
})();
