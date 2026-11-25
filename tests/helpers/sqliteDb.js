import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

// Real SQLite SQL execution behind the small D1 surface used by read routes.
export function createSqliteDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../schema.sql", import.meta.url), "utf8"));
  return {
    sqlite,
    async batch(statements) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map(statement => statement.runSync());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
    prepare(sql) {
      let bindings = [];
      const statement = {
        bind(...values) { bindings = values; return statement; },
        async all() { return { results: sqlite.prepare(sql).all(...bindings) }; },
        async first() { return sqlite.prepare(sql).get(...bindings) ?? null; },
        runSync() {
          const result = sqlite.prepare(sql).run(...bindings);
          return { meta: { changes:Number(result.changes), last_row_id:Number(result.lastInsertRowid) } };
        },
        async run() { return statement.runSync(); },
      };
      return statement;
    },
  };
}

export function seedPlayers(db) {
  for (let id = 1; id <= 8; id++) {
    db.sqlite.prepare(`INSERT INTO users
      (id,student_id,password,name,department,degree,year,gender,is_approved,total_matches,wins,losses)
      VALUES (?,?, 'not-a-login-password',?,'Test','Test',1,'other',?,999,999,999)`)
      .run(id, `test${id}`, ["Alice", "Bob", "Charlie", "Dana", "Erin", "Deleted", "Pending", "Fay"][id - 1], id === 7 ? 0 : 1);
  }
  db.sqlite.exec("UPDATE users SET deleted_at='2026-01-01' WHERE id=6");
}

export function seedMatch(db, { id, players = [1, 2, 3, 4], ended = null, winner = null, deleted = null, score = null }) {
  db.sqlite.prepare(`INSERT INTO matches
    (id,court_id,team1_player1_id,team1_player2_id,team2_player1_id,team2_player2_id,game_type,started_at,ended_at,winner_team,deleted_at,score)
    VALUES (?,1,?,?,?,?,'mixed_double','2026-06-19 04:00:00',?,?,?,?)`)
    .run(id, ...players, ended, winner, deleted, score);
}
