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
const uuid = require('uuid');
const short = require('short-uuid');

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
            startTime TEXT NOT NULL,
            endTime TEXT NOT NULL,
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

const readableUUIDTranslator = short(short.constants.flickrBase58);
function createShortUUID() {
    return readableUUIDTranslator.new();
}

function createNewEvent(firstDay, lastDay, startTime = null, endTime = null, ttl = 1_209_600) {
    const id = uuid.v4();
    const sql = `INSERT INTO events (id, firstDay, lastDay, startTime, endTime, dates, key, participants, ttl, creationTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [id, firstDay, lastDay, startTime, endTime, dates, key, participants, ttl, creationTime], (err) => {
        if (err) {
            console.error('Error inserting new event', err);
        } else {
            console.log('New event added successfully');
        }
    });
}

console.log(createShortUUID().length);
console.log(short.constants.flickrBase58);