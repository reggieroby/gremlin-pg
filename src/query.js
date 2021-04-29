import { Pool } from "pg";
import { v4 as uuid } from "uuid";
import { FauxGremlin,Predicate } from "./FauxGremlin";

export function poolQuery({ dbConfig, logger = console.error } = {}) {
  const pool = new Pool(dbConfig);
  return async function pgPoolClientQuery(...params) {
    let client;
    try {
      client = await pool.connect();
      const res = await client.query(...params);
      client.release();
      return res;
    } catch (err) {
      client && client.release();
      logger({ message: err.message, ...err, params });
      console.trace();
      throw "Server Database Error";
    }
  };
}

export function graph(dbConfig) {
  const query = poolQuery({ dbConfig });
  return {
    query,
    P:Predicate,
    g() {
      return new FauxGremlin(query);
    },
    async addV({ type, props = {} }) {
      const keys = [
        ...Object.keys(props),
        "in_e",
        "out_e",
        "uuid",
        "version",
        "created_at",
        "updated_at",
      ];
      let now = Date.now();
      const values = [...Object.values(props), {}, {}, uuid(), 1, now, now];

      const {
        rows: [Vertex],
      } = await query(..._insert(type, keys, values));
      return Vertex;
    },
    async createVertex({ type, props }) {
      await query(_createType(type, props));
    },
    async createEdge({ type, from, to, props = [] }) {
      await query(_createType([from, type, to].join("__"), props));
    },
    async addE({ type, from, to, props = {} }) {
      const [fromType, fromID] = from.split(":");
      const [toType, toID] = to.split(":");

      const edgeType = `${fromType}__${type}__${toType}`;
      const keys = [
        ...Object.keys(props),
        "in_e",
        "out_e",
        "uuid",
        "version",
        "created_at",
        "updated_at",
      ];
      let now = Date.now();
      const values = [
        ...Object.values(props),
        { type: fromType, uuid: fromID },
        { type: toType, uuid: toID },
        uuid(),
        1,
        now,
        now,
      ];
      const {
        rows: [Edge],
      } = await query(..._insert(edgeType, keys, values));
      await query(
        ..._attachEdge([toType, toID], "in_e", [edgeType, Edge.uuid])
      );
      await query(
        ..._attachEdge([fromType, fromID], "out_e", [edgeType, Edge.uuid])
      );

      return Edge;
    },
  };
}
function _printIndexs(values) {
  return values.map((_, i) => `$${i + 1}`);
}
function _insert(type, keys, values) {
  return [
    `INSERT INTO ${type} (${keys}) VALUES
      (${_printIndexs(values)})
      RETURNING *;
    `,
    values,
  ];
}
function _attachEdge([vType, vID], direction, [eType, eID]) {
  return [
    `UPDATE ${vType}
      SET ${direction} = CASE
        WHEN ${direction} ? '${eType}' IS FALSE
          THEN jsonb_set(${direction},'{${eType}}',jsonb_build_array($2::text))
        ELSE jsonb_insert(${direction},'{${eType},0}',to_jsonb($2::text))
      END
      where uuid=$1
      RETURNING *;
    `,
    [vID, eID],
  ];
}
function _createType(type, props = []) {
  return `CREATE TABLE IF NOT EXISTS ${type} (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(255),
    ${props.join(",\n\t")}${props.length ? "," : ""}
    in_e jsonb,
    out_e jsonb,
    version VARCHAR(255),
    created_at VARCHAR(255),
    updated_at VARCHAR(255)
  );`;
}
