export class MockD1Database {
  constructor(handler) {
    this.handler = handler;
    this.calls = [];
  }

  prepare(sql) {
    return new MockD1Statement(this, sql.replace(/\s+/g, " ").trim());
  }

  async execute(operation, sql, bindings) {
    const call = { operation, sql, bindings };
    this.calls.push(call);
    return this.handler(call);
  }
}

class MockD1Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.bindings = [];
  }

  bind(...bindings) {
    this.bindings = bindings;
    return this;
  }

  first() {
    return this.database.execute("first", this.sql, this.bindings);
  }

  all() {
    return this.database.execute("all", this.sql, this.bindings);
  }

  run() {
    return this.database.execute("run", this.sql, this.bindings);
  }
}
