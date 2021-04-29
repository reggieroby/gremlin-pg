import express from "express";

import { graph } from "@codealpha/gremlin-pg";
const app = express();

const dbConfig = {
  user: "dbuser",
  host: "localhost",
  password: "asdf1234",
  port: 5432,
};

export const Server = async () => {
  app
    .use("/q", async (req, res, next) => {
      res.send(`<html><script>fetch('/qq')</script></html>`);
    })
    .use("/qq", async (req, res, next) => {
      const { g, query } = graph(dbConfig);

      // res.send(`<pre>${JSON.stringify({a,b},null,2)}</pre>`);
      res.send({ a, b });
    })
    .listen(5000, () => {
      console.log(`NPM - Gremlin PG`);
    });
};
