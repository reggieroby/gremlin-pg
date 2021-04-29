import { graph } from "../dist";

const dbConfig = {
  user: "dbuser",
  host: "localhost",
  password: "asdf1234",
  port: 5432,
};
const usableDB = graph(dbConfig);
const database = 'fauxgremlinspecrunner'

export const Server = async () => {
  await usableDB.query(`DROP DATABASE IF EXISTS ${database}`)
  await usableDB.query(`CREATE DATABASE ${database}`)

  const {createVertex, createEdge, addV, addE,query} = graph({...dbConfig,database});

  await Promise.all([
    createVertex({
      type:'titan',
      props:['name TEXT', 'age INTEGER']
    }),
    createVertex({
      type:'god',
      props:['name TEXT', 'age INTEGER']
    }),
    createVertex({
      type:'demigod',
      props:['name TEXT', 'age INTEGER']
    }),
    createVertex({
      type:'human',
      props:['name TEXT', 'age INTEGER']
    }),
    createVertex({
      type:'monster',
      props:['name TEXT']
    }),
    createVertex({
      type:'location',
      props:['name TEXT']
    }),
    createEdge({
      type:'father',
      from:'god',
      to:'titan',
    }),
    createEdge({
      type:'lives',
      props:['reason TEXT'],
      from:'god',
      to:'location',
    }),
    createEdge({
      type:'brother',
      from:'god',
      to:'god',
    }),
    createEdge({
      type:'father',
      from:'demigod',
      to:'god',
    }),
    createEdge({
      type:'mother',
      from:'demigod',
      to:'human',
    }),
    createEdge({
      type:'battled',
      from:'demigod',
      to:'monster',
      props:['time INTEGER','place NUMERIC []']
    }),
    createEdge({
      type:'pet',
      from:'god',
      to:'monster',
    }),
    createEdge({
      type:'lives',
      from:'monster',
      to:'location',
    }),
  ])
  

  // vertices
  const [
    saturn,
    jupiter,
    neptune,
    pluto,
    hercules,
    alcmene,
    nemean,
    hydra,
    cerberus,
    sky,
    sea,
    tartarus,
  ] = await Promise.all([
    addV({
      type: "titan",
      props: { "name": "saturn","age": 10000 },
    }),
    addV({
      type: "god",
      props: { "name": "jupiter", "age": 5000 },
    }),
    addV({
      type: "god",
      props: { "name": "neptune", "age": 4500 },
    }),
    addV({
      type: "god",
      props: { "name": "pluto", "age": 4000 },
    }),
    addV({
      type: "demigod",
      props: { "name": "hercules", "age": 30 },
    }),
    addV({
      type: "human",
      props: { "name": "alcmene", "age": 45 },
    }),
    addV({
      type: "monster",
      props: { "name": "nemean" },
    }),
    addV({
      type: "monster",
      props: { "name": "hydra" },
    }),
    addV({
      type: "monster",
      props: { "name": "cerberus" },
    }),
    addV({
      type: "location",
      props: { "name": "sky" },
    }),
    addV({
      type: "location",
      props: { "name": "sea" },
    }),
    addV({
      type: "location",
      props: { "name": "tartarus" },
    }),
  ])

  // // edges

  await Promise.all([
    addE({
      from: `god:${jupiter.uuid}`,
      type: "father",
      to: `titan:${saturn.uuid}`,
    }),
    addE({
      from: `god:${jupiter.uuid}`,
      type: "lives",
      to: `location:${sky.uuid}`,
      props:{"reason": "loves fresh breezes"}
    }),
    addE({
      from: `god:${jupiter.uuid}`,
      type: "brother",
      to: `god:${neptune.uuid}`,
    }),
    addE({
      from: `god:${jupiter.uuid}`,
      type: "brother",
      to: `god:${pluto.uuid}`,
    }),
    addE({
      from: `god:${neptune.uuid}`,
      type: "lives",
      to: `location:${sea.uuid}`,
      props:{"reason": "loves waves"}
    }),
    addE({
      from: `god:${neptune.uuid}`,
      type: "brother",
      to: `god:${jupiter.uuid}`,
    }),
    addE({
      from: `god:${neptune.uuid}`,
      type: "brother",
      to: `god:${pluto.uuid}`,
    }),
    addE({
      from: `demigod:${hercules.uuid}`,
      type: "father",
      to: `god:${jupiter.uuid}`,
    }),
    addE({
      from: `demigod:${hercules.uuid}`,
      type: "mother",
      to: `human:${alcmene.uuid}`,
    }),
    addE({
      from: `demigod:${hercules.uuid}`,
      type: "battled",
      to: `monster:${nemean.uuid}`,
      props:{"time": 1, "place": [38.1, 23.7]},
    }),
    addE({
      from: `demigod:${hercules.uuid}`,
      type: "battled",
      to: `monster:${hydra.uuid}`,
      props:{"time": 2, "place": [37.7, 23.9]},
    }),
    addE({
      from: `demigod:${hercules.uuid}`,
      type: "battled",
      to: `monster:${cerberus.uuid}`,
      props:{"time": 12, "place": [39, 22]},
    }),
    addE({
      from: `god:${pluto.uuid}`,
      type: "brother",
      to: `god:${jupiter.uuid}`,
    }),
    addE({
      from: `god:${pluto.uuid}`,
      type: "brother",
      to: `god:${neptune.uuid}`,
    }),
    addE({
      from: `god:${pluto.uuid}`,
      type: "lives",
      to: `location:${tartarus.uuid}`,
      props:{"reason": "no fear of death"}
    }),
    addE({
      from: `god:${pluto.uuid}`,
      type: "pet",
      to: `monster:${cerberus.uuid}`,
    }),
    addE({
      from: `monster:${cerberus.uuid}`,
      type: "lives",
      to: `location:${tartarus.uuid}`,
    }),
  ])
  process.exit()
};

Server()