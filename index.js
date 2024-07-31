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

/* TODO:

- If admin sets a time, verify that it is in a 30-min interval server-side (or 15-min, or 5-min, or whatever) (ALSO DON'T FORGET TIMEZONES)
- For a user, save their username as a cookie to log back in later. (And a note that says "please remember your username to amend your vote later")
- For each user, a unique avatar is generated based on their username. (This is to prevent impersonation, and also to make the site more fun)
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
    const participants = "{}";
    const dates = JSON.stringify(populateDates(firstDay, lastDay));

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

// Function to populate the dates dictionary with the days between the first and last day of the event (inclusive), with array for responded users and tentative users.
/* EXAMPLE:

"2024-01-01": {
    "blockers": ["user1", "user2"],
    "tentative": ["user3"]

*/
/* Removed STATE variable, because state can be inferred client-side from absence or presence of users in given arrays. Having the variable would make it difficult to accurately update the state if a user withdraws their block/tentativity*/

function populateDates(firstDay, lastDay) {
    if (new Date(firstDay) > new Date(lastDay)) {
        throw new Error('Invalid date range: first day occurs after last day');
    }

    const dates = {};
    const date = new Date(firstDay);
    const lastDate = new Date(lastDay);

    while (date <= lastDate) {
        const dateString = date.toISOString().split('T')[0];
        dates[dateString] = {
            b: [],
            t: []
        };

        date.setDate(date.getDate() + 1);
    }

    return dates;
}

function blockOutDate(eventid, date, status, user) {
    db.get(`SELECT dates, participants FROM events WHERE id = ?`, [eventid], (err, row) => {
        if (err) {
            console.error('Error retrieving dates from database', err);
        } else {
            const dates = JSON.parse(row.dates);
            // Do some work on the dates JSON object

            if (status === "free") {
                // Remove user from both array b and array t
                Object.values(dates).forEach((date) => {
                    date.b = date.b.filter((user) => user !== user);
                    date.t = date.t.filter((user) => user !== user);
                });
            } else if (status === "tentative") {
                // Remove user from array b and append to array t
                Object.values(dates).forEach((date) => {
                    date.b = date.b.filter((user) => user !== user);
                    date.t.push(user);
                });
            } else if (status === "block") {
                // Remove user from array t and add to array b
                Object.values(dates).forEach((date) => {
                    date.t = date.t.filter((user) => user !== user);
                    date.b.push(user);
                });
            }

            const updatedDates = JSON.stringify(dates);

            // Check if the user already exists in the dictionary
            const users = JSON.parse(row.participants);
            if (!users.hasOwnProperty(user)) {
                // Add the new user to the dictionary
                users[user] = {"avatar": "#97a8ef"}; // Placeholder avatar color, generate random
            }

            // Update the record with the new users dictionary
            const updatedUsers = JSON.stringify(users);
            db.run(`UPDATE events SET dates = ?, participants = ? WHERE id = ?`, [updatedDates, updatedUsers, eventid], (err) => {
                if (err) {
                    console.error('Error updating users in database', err);
                } else {
                    console.log('Users updated successfully');
                }
            });
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
// createNewEvent("2024-01-01", "2024-01-05", startTime = null, endTime = null, ttl = 1_209_600);

// console.log(populateDates("2024-01-05", "2024-01-05"));

blockOutDate("chop-coach-blimp", "2024-01-01", "block", "steveeeen");