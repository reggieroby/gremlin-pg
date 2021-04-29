
export async function removeV(query, { type, uuid }) {
  const inEdgeNames = (
    await query(
      `SELECT
    jsonb_object_keys(in_e) as in
  FROM ${type}
  WHERE uuid=$1`,
      [uuid]
    )
  ).rows.map((o) => o.in.split("__"));

  for (let i = 0; i < inEdgeNames.length; i++) {
    let edgeType = inEdgeNames[i].join("__");

    await detachAdjacentVertexIn({
      uuid,
      edgeType,
    });
  }

  const outEdgeNames = (
    await query(
      `SELECT
    jsonb_object_keys(out_e) as out
  FROM ${type}
  WHERE uuid=$1`,
      [uuid]
    )
  ).rows.map((o) => o.out.split("__"));

  for (let i = 0; i < outEdgeNames.length; i++) {
    let edgeType = outEdgeNames[i].join("__");

    await detachAdjacentVertexOut({
      uuid,
      edgeType,
    });
  }

  await query(`DELETE FROM ${type} WHERE uuid=$1`, [uuid]);

  return true;

  async function detachAdjacentVertexIn({ uuid, edgeType }) {
    let [from, , to] = edgeType.split("__");

    let getTriples = `WITH
      p0 as (SELECT
                jsonb_build_array($1::text) path, in_e
              FROM ${to}
              where uuid=$1),
      p1 as (SELECT
                path || jsonb_build_array(${edgeType}.uuid) as path
              FROM ${edgeType}, p0
              where p0.in_e->'${edgeType}' ? ${edgeType}.uuid),
      p2 as (SELECT
                path || jsonb_build_array(${from}.uuid) as path
              FROM ${from}, p1
              where ${from}.out_e->'${edgeType}' ? (path->>1)::text),
      res as (SELECT * FROM p2)

      UPDATE ${from}
          SET out_e=jsonb_set(${from}.out_e,'{${edgeType}}',((${from}.out_e->'${edgeType}') - (path->>1)::text))
        FROM res
        WHERE path->>2=${from}.uuid
      RETURNING *
    `;
    let removeEdges = `DELETE
                        FROM ${edgeType}
                        WHERE to_jsonb($1::text[]) ? uuid
                      RETURNING *`;

    let edgeIDs = (await query(getTriples, [uuid])).rows.map((o) => o.path[1]);
    return await query(removeEdges, [edgeIDs]);
  }
  async function detachAdjacentVertexOut({ uuid, edgeType }) {
    let [from, , to] = edgeType.split("__");

    let getTriples = `WITH
      p0 as (SELECT
                jsonb_build_array($1::text) path, out_e
              FROM ${from}
              where uuid=$1),
      p1 as (SELECT
                path || jsonb_build_array(${edgeType}.uuid) as path
              FROM ${edgeType}, p0
              where p0.out_e->'${edgeType}' ? ${edgeType}.uuid),
      p2 as (SELECT
                path || jsonb_build_array(${to}.uuid) as path
              FROM ${to}, p1
              where ${to}.in_e->'${edgeType}' ? (path->>1)::text),
      res as (SELECT * FROM p2)

      UPDATE ${to}
          SET in_e=jsonb_set(${to}.in_e,'{${edgeType}}',((${to}.in_e->'${edgeType}') - (path->>1)::text))
        FROM res
        WHERE path->>2=${to}.uuid
      RETURNING *
    `;
    let removeEdges = `DELETE
                        FROM ${edgeType}
                        WHERE to_jsonb($1::text[]) ? uuid
                      RETURNING *`;

    let edgeIDs = (await query(getTriples, [uuid])).rows.map((o) => o.path[1]);
    return await query(removeEdges, [edgeIDs]);
  }
}

export async function removeE(query, { type: edgeType, uuid }) {
  let [from, , to] = edgeType.split("__");

  let {
    rows: [edge],
  } = await query(
    `SELECT * FROM ${edgeType}
        WHERE uuid=$1
        `,
    [uuid]
  );

  await query(
    `UPDATE ${from}
          SET out_e=jsonb_set(${from}.out_e,'{${edgeType}}',((${from}.out_e->'${edgeType}') - '${edge.uuid}'))
        WHERE uuid='${edge.in_e.uuid}'`
  );
  await query(
    `UPDATE ${to}
          SET in_e=jsonb_set(${to}.in_e,'{${edgeType}}',((${to}.in_e->'${edgeType}') - '${edge.uuid}'))
        WHERE uuid='${edge.out_e.uuid}'`
  );
  await query(`DELETE FROM ${edgeType} WHERE uuid='${edge.uuid}'`);
  return true;
}

export async function update(query, { type, uuids, props }) {
  const protectedProps = [
    "id",
    "uuid",
    "in_e",
    "out_e",
    "version",
    "created_at",
    "updated_at",
  ];
  const entries = Object.entries(props).filter(
    ([k, v]) => !protectedProps.includes(k)
  );
  const safeProps = Object.fromEntries(entries);
  const keys = Object.keys(safeProps);
  const values = Object.values(safeProps);

  const { rows } = await query(
    `UPDATE ${type}
  SET version = version::float + 1, ${[...keys, "updated_at"]
    .map((k, i) => `${k}=$${i + 2}`)
    .join()} 
  WHERE to_jsonb($1::text[]) ? uuid
  RETURNING *;`,
    [Array.isArray(uuids) ? uuids : [uuids], ...values, Date.now()]
  );
  return true;
}



export function buildPath({knex,enabled=false}){
  const blankCol = ()=>knex.raw(`'' as blankcol`)
  return enabled? 
  {
    start:() => knex.raw(`jsonb_build_array(uuid) AS path`),
    include:(prevTable) => knex.raw(`${prevTable}.path`),
    append:(prevTable, currTable) =>
    knex.raw(`${prevTable}.path || jsonb_build_array(${currTable}.uuid) AS path`),
  }:{
    start:blankCol,
    include:blankCol,
    append:blankCol,
  }
}

export function _VhasE(V, direction, edgeType, E){
  return `${V}.${direction}->'${edgeType}' \\? ${E}.uuid`;
}