/* Availi - Poll-based availability aggregator. 
Copyright (C) 2024  GameDesert

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

/* Process:
- Create new event, between two dates. (Also given is the option to select a time range. If none is given, then voting is for the entire day.) Event is given a uuid.
- Admin is issued 4-digit pin to amend or delete event (before TTL is up)
- Every day is assumed as free, unless somebody objects.
- Each of those days holds two arrays, one objected and one tentative, when somebody objects, or is tentative, they are added to one of those arrays. If they are also a new user, they are added to the participants array.
- Everyone can see what days have already been objected to, what days are tentative, and what days are free.
*/

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const readline = require('readline');

const db = new sqlite3.Database('./availabilities.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Database opened successfully');
    }
});

function createNewDB() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            firstDay TEXT NOT NULL,
            lastDay TEXT NOT NULL,
            startTime TEXT,
            endTime TEXT,
            dates TEXT NOT NULL,
            key TEXT NOT NULL,
            participants TEXT NOT NULL,
            ttl INT NOT NULL,
            creationTime INT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err);
            } else {
                console.log('Table created successfully');
            }
        });
    });
    
    db.close((err) => {
        if (err) {
            console.error('Error closing database', err);
        } else {
            console.log('Database connection closed');
        }
    });
}


function selectRandomWords(filePath, count) {
    return new Promise((resolve, reject) => {
        const words = [];
        const stream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            words.push(line);
        });

        rl.on('close', () => {
            const randomWords = [];
            const totalWords = words.length;

            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * totalWords);
                randomWords.push(words[randomIndex]);
            }

            resolve(randomWords);
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

async function createNewEvent(firstDay, lastDay, startTime = null, endTime = null, ttl = 1_209_600) {
    const randwords = await selectRandomWords('wordlist.txt', 3)
    .catch((err) => {
        console.error('Error selecting random words', err);
    });

    const id = randwords.join('-');

    const key = Math.floor(Math.random() * 9000) + 1000;
    const creationTime = Math.floor(Date.now() / 1000);
    const participants = "[]";
    const dates = "{}";

    const sql = `INSERT INTO events (id, firstDay, lastDay, startTime, endTime, dates, key, participants, ttl, creationTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [id, firstDay, lastDay, startTime, endTime, dates, key, participants, ttl, creationTime], (err) => {
        if (err) {
            console.error('Error inserting new event', err);
        } else {
            console.log('New event added successfully');
        }
    });

    db.close((err) => {
        if (err) {
            console.error('Error closing database', err);
        } else {
            console.log('Database connection closed');
        }
    });
}


// Usage example
// selectRandomWords('wordlist.txt', 3)
//     .then((randomWords) => {
//         console.log(randomWords);
//     })
//     .catch((err) => {
//         console.error('Error selecting random words', err);
//     });

// createNewDB();
createNewEvent("2024-01-01", "2024-01-05", startTime = null, endTime = null, ttl = 1_209_600);