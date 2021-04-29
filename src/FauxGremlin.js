import knex from 'knex'
import { customAlphabet } from 'nanoid/non-secure'
import { removeE, removeV, update, buildPath, _VhasE } from "./things";

const STEP_NAME = Object.freeze({
  V: "V",
  E: "E",

  Out: "out",
  OutE: "outE",
  OutV: "outV",

  In: "in",
  InE: "inE",
  InV: "inV",

  Has: "has",
  HasId: "hasId",

  Path: 'path',
  Where: 'where',
  _SelectFrom: '_selectFrom',
});

const RESULT_TYPE = Object.freeze({
  Vertex: "Vertex",
  Edge: "Edge",
});

export const Predicate = Object.freeze({
  eq(val){
    return (key)=> [val,(varIndex)=>`${key}=${varIndex}`]
  },
  neq(val){
    return (key)=> [val,(varIndex)=>`${key}!=${varIndex}`]
  },
  lt(val){
    return (key)=> [val,(varIndex)=>`${key}<${varIndex}`]
  },
  lte(val){
    return (key)=> [val,(varIndex)=>`${key}<=${varIndex}`]
  },
  gt(val){
    return (key)=> [val,(varIndex)=>`${key}>${varIndex}`]
  },
  gte(val){
    return (key)=> [val,(varIndex)=>`${key}>=${varIndex}`]
  },
  inside(first,second){
    return (key)=> [[first,second],(varIndex)=>`(to_jsonb(${key})>to_jsonb(${varIndex}::numeric[])->0 AND to_jsonb(${key})<to_jsonb(${varIndex}::numeric[])->1)`]
  },
  outside(first,second){
    return (key)=> [[first,second],(varIndex)=>`(to_jsonb(${key})<to_jsonb(${varIndex}::numeric[])->0 OR to_jsonb(${key})>to_jsonb(${varIndex}::numeric[])->1)`]
  },
  between(first,second){
    return (key)=> [[first,second],(varIndex)=>`(to_jsonb(${key})>=to_jsonb(${varIndex}::numeric[])->0 AND to_jsonb(${key})<to_jsonb(${varIndex}::numeric[])->1)`]
  },
  within(vals){
    return (key)=> [vals,(varIndex)=>`${key} = ANY (${varIndex}::${typeof vals[0]==='string'?'text':'numeric'}[])`]
  },
  without(vals){
    return (key)=> [vals,(varIndex)=>`NOT (${key} = ANY (${varIndex}::${typeof vals[0]==='string'?'text':'numeric'}[]))`]
  },
  custom(fnc){
    return (...vals) => (key) => [vals.length===1?vals[0]:vals,(varIndex)=>fnc(key,varIndex,vals.length===1?vals[0]:vals)]
  }
})
const P = Predicate

export class FauxGremlin {
  constructor(query,{varOffset=0}={}) {
    this.nanoid = customAlphabet('1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM', 5)
    this.knex = knex({
      client: 'pg',
    })
    this.query = query;
    this.steps = [
      /*
      {
        label,        required  // sql table name
        stepName,     required  // the name of the step
        resultType,   required  // type of element produced from step
        stepValue,              // any value the step needs during compilation
      }
  */
    ];
    this.metaData = {
      hasPathStep:false,
      varOffset,
    }
  }

  // ****************     .map() / Traversal Steps      ******************

  V(label, vID) {
    if (this.steps.length !== 0) throw "V() resets query.";

    this.steps.push({
      stepName: STEP_NAME.V,
      resultType: RESULT_TYPE.Vertex,
      stepValue: Array.isArray(vID) || vID===undefined ? vID : [vID],
      label,
    });

    return this;
  }
  E(label, eID) {
    if (this.steps.length !== 0) throw "E() resets query.";

    this.steps.push({
      stepName: STEP_NAME.E,
      resultType: RESULT_TYPE.Edge,
      stepValue: Array.isArray(eID) || eID===undefined ? eID : [eID],
      label,
    });

    return this;
  }
  out(label) {
    const lastStep = this.steps[this.steps.length - 1];

    if (lastStep.resultType !== RESULT_TYPE.Vertex)
      throw "out() must be called from a Vertex step.";

    this.steps.push({
      stepName: STEP_NAME.Out,
      resultType: RESULT_TYPE.Vertex,
      label,
    });

    return this;
  }
  outE(label) {
    const lastStep = this.steps[this.steps.length - 1];

    if (lastStep.resultType !== RESULT_TYPE.Vertex)
      throw "outE() must be called from a Vertex step.";

    this.steps.push({
      stepName: STEP_NAME.OutE,
      resultType: RESULT_TYPE.Edge,
      label,
    });

    return this;
  }
  outV() {
    const lastStep = this.steps[this.steps.length - 1];

    if (lastStep.resultType !== RESULT_TYPE.Edge)
      throw "outV() must be called from an Edge step.";

    let [label] = lastStep.label.split("__");

    this.steps.push({
      stepName: STEP_NAME.OutV,
      resultType: RESULT_TYPE.Vertex,
      label,
    });

    return this;
  }
  in(label) {
    const lastStep = this.steps[this.steps.length - 1];

    if (lastStep.resultType !== RESULT_TYPE.Vertex)
      throw "in() must be called from a Vertex step.";

    this.steps.push({
      stepName: STEP_NAME.In,
      resultType: RESULT_TYPE.Vertex,
      label,
    });

    return this;
  }
  inV() {
    const lastStep = this.steps[this.steps.length - 1];

    if (lastStep.resultType !== RESULT_TYPE.Edge)
      throw "inV() must be called from an Edge step.";

    let [, , label] = lastStep.label.split("__");

    this.steps.push({
      stepName: STEP_NAME.InV,
      resultType: RESULT_TYPE.Vertex,
      label,
    });

    return this;
  }
  inE(label) {
    const lastStep = this.steps[this.steps.length - 1];

    if (lastStep.resultType !== RESULT_TYPE.Vertex)
      throw "inE() must be called from a Vertex step.";

    this.steps.push({
      stepName: STEP_NAME.InE,
      resultType: RESULT_TYPE.Edge,
      label,
    });

    return this;
  }

  // ****************     .map() / Filter Steps      ******************

  has(...params) {
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "has() must be called from a Vertex/Edge step.";

    this.steps.push({
      stepName: STEP_NAME.Has,
      resultType: lastStep.resultType,
      label: lastStep.label,
      stepValue: params,
    });

    return this;
  }
  hasId(ids) {
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "hasId() must be called from a Vertex/Edge step.";

    this.steps.push({
      stepName: STEP_NAME.HasId,
      resultType: lastStep.resultType,
      label: lastStep.label,
      stepValue: Array.isArray(ids) ? ids : [ids],
    });

    return this;
  }
  where(fnc){
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "where() must be called from a Vertex/Edge step.";

    this.steps.push({
      stepName: STEP_NAME.Where,
      resultType: lastStep.resultType,
      label: lastStep.label,
      stepValue: fnc
    });

    return this;
  }



  // ****************     .emit() / Mutation Steps      ******************


  async property(props) {
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "property() must be called from a Vertex/Edge step.";

    let { query, vars, tableQueries } = await this._compile();
    let { rows } = await this.query(query, vars);

    const { collection } = tableQueries[tableQueries.length - 1];

    await update(this.query, {
      type: collection,
      uuids: rows.map(({ uuid }) => uuid),
      props,
    });

    return null;
  }
  async drop() {
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "drop() must be called from a Vertex/Edge step.";

    let { query, vars, tableQueries } = await this._compile();
    let { rows } = await this.query(query, vars);

    const { collection } = tableQueries[tableQueries.length - 1];
    const isVertex = collection.split("__").length === 1;

    for (let v of rows) {
      let args = [this.query, { type: collection, uuid: v.uuid }];
      isVertex ? await removeV(...args) : await removeE(...args);
    }

    return null;
  }

  // ****************     .emit() / Terminal Steps      ******************

  async path() {
    this.metaData.hasPathStep = true;
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "path() must be called from a Vertex/Edge step.";

    let rows = await this.valueMap();
    return rows.map(({ path }) => path);
  }
  async explain() {
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "explain() must be called from a Vertex/Edge step.";

    return await this._compile();
  }
  async valueMap() {
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "valueMap() must be called from a Vertex/Edge step.";

    let { query, vars } = await this._compile();
    let { rows } = await this.query(query, vars);

    return rows;
  }
  async toList() {
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "toList() must be called from a Vertex/Edge step.";

    let rows = await this.valueMap();

    return rows.map(({ uuid }) => uuid);
  }
  async toSet() {
    const lastStep = this.steps[this.steps.length - 1];

    if (![RESULT_TYPE.Edge, RESULT_TYPE.Vertex].includes(lastStep.resultType))
      throw "toSet() must be called from a Vertex/Edge step.";

    return [...new Set(await this.toList())];
  }

  // ****************     .util() / Convert Steps to SQL      ******************

  _selectFrom(label,resultType,collection) {
    if (this.steps.length !== 0) throw "_selectFrom() is used in where() subquery.";

    this.metaData.hasPathStep = true;

    this.steps.push({
      stepName: STEP_NAME._SelectFrom,
      resultType,
      label,
      stepValue:collection
    });

    return this;
  }
  async _compile() {
    const path = buildPath({knex:this.knex,enabled:this.metaData.hasPathStep})

    let tableQueries = [];
    for(let index=0;index<this.steps.length;index++){
      const step = this.steps[index]
      const lastStep = this.steps[index - 1];
      const lastTable = tableQueries[tableQueries.length - 1];
      const stepCount = index + 1;
      const { stepName, stepValue, label } = step;
      const name = `t${stepCount}_${stepName}_${this.nanoid()}`;

      if ([STEP_NAME.E, STEP_NAME.V].includes(stepName)) {
        let entityType = label;
        let tableData = {
          q: (varIndex) => this.knex
            .select(`*`,path.start())
            .from(entityType)
            .whereRaw(`to_jsonb(${varIndex}::text[]) \\? uuid`)
            .toSQL().toNative().sql,
          vars: [stepValue],
        }
        if(stepValue===undefined){
          tableData = {
            q: this.knex
              .select(`*`,path.start())
              .from(entityType)
              .toSQL().toNative().sql,
          }
        }
        let table = {
          name,
          ...tableData,
          collection: entityType,
        };
        tableQueries.push(table);
      } else if (stepName === STEP_NAME.OutE) {
        let fromV = lastTable.name,
          edgeType = label;
        let table = {
          name,
          q: this.knex
          .select(`${edgeType}.*`,path.append(fromV, edgeType))
          .joinRaw(`from ${fromV} , ${edgeType}`)
          .whereRaw(_VhasE(fromV, "out_e", edgeType, edgeType))
          .toSQL().toNative().sql,
          collection: edgeType,
        };
        tableQueries.push(table);
      } else if (stepName === STEP_NAME.InV) {
        let { name: fromE, collection: edgeType } = lastTable;
        let [, , toV] = edgeType.split("__");

        let table = {
          name,
          q: this.knex
          .select(`${toV}.*`,path.append(fromE, toV))
          .joinRaw(`from ${fromE} , ${toV}`)
          .whereRaw(_VhasE(toV, "in_e", edgeType, fromE))
          .toSQL().toNative().sql,
          collection: toV,
        };
        tableQueries.push(table);
      } else if (stepName === STEP_NAME.Out) {
        let fromV = lastTable.name,
          edgeType = label;
        let [, , toV] = edgeType.split("__");

        let edgeTable = {
          name: name + "1",
          q: this.knex
          .select(`${edgeType}.*`,path.include(fromV))
          .joinRaw(`from ${fromV} , ${edgeType}`)
          .whereRaw(_VhasE(fromV, "out_e", edgeType, edgeType))
          .toSQL().toNative().sql,
          collection: edgeType,
        };
        let table = {
          name: name + "2",
          q: this.knex
          .select(`${toV}.*`,path.append(edgeTable.name, toV))
          .joinRaw(`from ${edgeTable.name} , ${toV}`)
          .whereRaw(_VhasE(toV, "in_e", edgeType, edgeTable.name))
          .toSQL().toNative().sql,
          collection: toV,
        };
        tableQueries.push(edgeTable, table);
      } else if (stepName === STEP_NAME.InE) {
        let fromV = lastTable.name,
          edgeType = label;

        let table = {
          name,
          q: this.knex
          .select(`${edgeType}.*`,path.append(fromV, edgeType))
          .joinRaw(`from ${fromV} , ${edgeType}`)
          .whereRaw(_VhasE(fromV, "in_e", edgeType, edgeType))
          .toSQL().toNative().sql,
          collection: edgeType,
        };
        tableQueries.push(table);
      } else if (stepName === STEP_NAME.OutV) {
        let { collection: fromE, name: edgeType } = lastTable;
        let [toV] = fromE.split("__");

        let table = {
          name,
          q: this.knex
          .select(`${toV}.*`,path.append(edgeType, toV))
          .joinRaw(`from ${edgeType} , ${toV}`)
          .whereRaw(_VhasE(toV, "out_e", fromE, edgeType))
          .toSQL().toNative().sql,
          collection: toV,
        };
        tableQueries.push(table);
      } else if (stepName === STEP_NAME.In) {
        let fromV = lastTable.name,
          edgeType = label;
        let [toV] = edgeType.split("__");

        let edgeTable = {
          name: name + "1",
          q: this.knex
          .select(`${edgeType}.*`,path.include(fromV))
          .joinRaw(`from ${edgeType} , ${fromV}`)
          .whereRaw(_VhasE(fromV, "in_e", edgeType, edgeType))
          .toSQL().toNative().sql,
          collection: edgeType,
        };
        let table = {
          name: name + "2",
          q: this.knex
          .select(`${toV}.*`,path.append(edgeTable.name, toV))
          .joinRaw(`from ${toV} , ${edgeTable.name}`)
          .whereRaw(_VhasE(toV, "out_e", edgeType, edgeTable.name))
          .toSQL().toNative().sql,
          collection: toV,
        };
        tableQueries.push(edgeTable, table);
      /******************************  Filter Steps  *********************************/
      } else if (stepName === STEP_NAME.Has) {
        //(key)
        
        //({key:value,...}) <= (key,value)
        //(key,predicate)
        //(key,traversal)

        //(label,key,value) // n/a
        let table = {}

        if(stepValue.length===1 && typeof stepValue[0] === 'object'){
          let kvFnc = Object.entries(stepValue[0]).map(([key,value]) =>{
            return (typeof value === 'function') ?
              value(key) :
              P.eq(value)(key)
          })

          table = {
            name,
            q: (...indices) => `SELECT * FROM ${lastTable.name}
              WHERE ${kvFnc.map(([,o],i)=>o(indices[i])).join(' AND ')}
            `,
            vars: kvFnc.map(([val])=>val),
            collection: label,
          };
        }
        tableQueries.push(table);
      } else if (stepName === STEP_NAME.HasId) {
        let table = {
          name,
          q: (varIndex) => `SELECT * FROM ${lastTable.name}
          WHERE to_jsonb(${varIndex}::text[]) ? uuid`,
          vars: [stepValue],
          collection: label,
        };
        tableQueries.push(table);
      } else if (stepName === STEP_NAME._SelectFrom) {
        let table = {
          name,
          q: `SELECT *, ${path.start()} FROM ${label}`,
          collection: stepValue,
        };
        tableQueries.push(table);
      } else if (stepName === STEP_NAME.Where) {
        const traversal = stepValue
        const currVarCount = tableQueries
          .map(({vars})=>vars?vars.length:0)
          .reduce((cnt,varCnt)=>varCnt+cnt,0)
        const traverser = new FauxGremlin(this.query,{varOffset:currVarCount})

        const traveler = traversal(traverser._selectFrom(lastTable.name,lastStep.resultType,lastTable.collection))
        let explaination = await traveler.explain()

        const wherePathTable = `t_where_path_${this.nanoid()}`
        explaination.query = `
          select ${lastTable.name}.*
          from (${explaination.query}) as ${wherePathTable}, ${lastTable.name}
          where ${wherePathTable}.path->0 = to_jsonb(${lastTable.name}.uuid)
        `
        
        let table = {
          name,
          q: ()=>explaination.query,
          vars:explaination.vars,
          collection: label,
        };
        tableQueries.push(table);
      }
    };

    let { queries, vars } = tableQueries.reduce(
      ({ queries, vars }, table) => {
        let q = `${table.name} AS `;
        q+='('
        if (table.vars) {
          q += table.q(...table.vars.map((_, i) => `$${i + vars.length + 1 + this.metaData.varOffset}`));
        } else {
          q += table.q;
        }
        q+=')'
        return {
          queries: [...queries, q],
          vars: [...vars, ...(table.vars || [])],
        };
      },
      { queries: [], vars: [] }
    );

    return {
      query: `WITH ${queries.join(",\n")}
        SELECT * FROM ${tableQueries[tableQueries.length - 1].name}
      `,
      vars,
      queries,
      tableQueries,
    };
  }
}