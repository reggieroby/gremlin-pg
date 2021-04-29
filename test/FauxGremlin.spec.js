import { graph } from "../dist";

const dbConfig = {
  user: "dbuser",
  host: "localhost",
  database: "fauxgremlinspecrunner",
  password: "asdf1234",
  port: 5432,
};
const { g, query, P } = graph(dbConfig);

/****************************  Basics  **************************/

describe("Edge", async () => {
  let jupiterLivesSky,plutoLivesTartarus;

  beforeAll(async (done) => {
    jupiterLivesSky = (await query(`select * from god__lives__location where reason='loves fresh breezes'`))
      .rows[0]
    plutoLivesTartarus = (await query(`select * from god__lives__location where reason='no fear of death'`))
      .rows[0]
    return done()
  });

  it("should have required props", async (done) => {
    const props = Object.keys(jupiterLivesSky);
    const hasRequirements = [
      "id",
      "uuid",
      "in_e",
      "out_e",
      "version",
      "created_at",
      "updated_at",
    ].every((req) => props.includes(req));
    expect(hasRequirements).toBe(true);
    done();
  });
  it("should have custom props", async (done) => {
    const hasRequirements = Object.keys(jupiterLivesSky).includes("reason");
    expect(hasRequirements).toBe(true);
    done();
  });
  it("(label) should return all edges", async (done) => {
    let edges = await g()
      .E("god__brother__god")
      .valueMap();
    expect(edges.length).toBe(6);
    done();
  });
  it("(label, uuid) should return single edge", async (done) => {
    let edges = await g()
      .E(
        "god__lives__location",
        jupiterLivesSky.uuid
      )
      .valueMap();
    expect(edges.length).toBe(1);
    done();
  });
  it("(label,[uuid]) should return multiple edges", async (done) => {
    let edges = await g()
      .E("god__lives__location", [
        jupiterLivesSky.uuid,
        plutoLivesTartarus.uuid,
      ])
      .valueMap();
    expect(edges.length).toBe(2);
    done();
  });
});

describe("Vertex", () => {
  let godJupiter,godNeptune;

  beforeAll(async (done) => {
    godJupiter = (await query(`select * from god where name='jupiter'`))
      .rows[0]
    godNeptune = (await query(`select * from god where name='neptune'`))
      .rows[0]
    return done()
  });

  it("should have required props", async (done) => {
    const props = Object.keys(godJupiter);
    const hasRequirements = [
      "id",
      "uuid",
      "in_e",
      "out_e",
      "version",
      "created_at",
      "updated_at",
    ].every((req) => props.includes(req));
    expect(hasRequirements).toBe(true);
    done();
  });
  it("should have custom props", async (done) => {
    const hasRequirements = Object.keys(godJupiter).includes("name");
    expect(hasRequirements).toBe(true);
    done();
  });
  it("(label) should return all vertices", async (done) => {
    let vertices = await g()
      .V("god")
      .valueMap();
      
    expect(vertices.length).toBe(3);
    done();
  });
  it("(label,uuid) should return single vertex", async (done) => {
    let vertices = await g()
      .V("god", godJupiter.uuid)
      .valueMap();
    expect(vertices.length).toBe(1);
    done();
  });
  it("(label,[uuid]) should return multiple vertices", async (done) => {
    let vertices = await g()
      .V("god", [
        godJupiter.uuid,
        godNeptune.uuid,
      ])
      .valueMap();
    expect(vertices.length).toBe(2);
    done();
  });
});

/****************************  Terminal  **************************/

describe("toList()", () => {
  it("should return only ids", async (done) => {
    let vertices = await g()
      .V("god")
      .toList();
    expect(vertices.every((v) => typeof v === "string")).toBe(true);
    expect(vertices.length).toBe(3);
    done();
  });
});
describe("toSet()", () => {
  it("should not return duplicate ids", async (done) => {
    let dedupedVertices = await g()
      .V("god")
      .out("god__brother__god")
      .toSet();
    expect(dedupedVertices.length).toBe(3);
    done();
  });
});
describe("explain()", () => {
  it("should contain relevant information", async (done) => {
    let explaination = await g()
      .V("god")
      .explain();
    const props = Object.keys(explaination);
    const hasRequirements = [
      "query",
      "vars",
      "queries",
      "tableQueries",
    ].every((req) => props.includes(req));
    expect(hasRequirements).toBe(true);
    done();
  });
});
describe("path()", () => {
  it("should contain all Vertex/Edge Ids traversed from source to destination", async (done) => {
    let paths = await g()
      .V("human")
      .in("demigod__mother__human")
      .out("demigod__father__god")
      .outE("god__father__titan")
      .inV()
      .inE("god__father__titan")
      .outV()
      .path();

    expect(paths.length).toBe(1);
    paths.forEach((path) => {
      expect(path.length).toBe(7);
    });
    done();
  });
});

// MUTATIONS
// property(props) {
// drop() {

/****************************  Filter Steps  **************************/



describe("has(props)", () => {
  describe("predicate values", () => {
    it("eq", async (done) => {
      let vertices = await g()
        .V("god")
        .out("god__lives__location")
        .has({ name: P.eq('sky') })
        .valueMap();
      expect(vertices.length).toBe(1);
      done();
    });
    it("neq", async (done) => {
      let vertices = await g()
        .V("god")
        .out("god__lives__location")
        .has({ name: P.neq('sky') })
        .valueMap();
      expect(vertices.length).toBe(2);
      done();
    });
    it("lt", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.lt(4500) })
        .valueMap();
      expect(vertices.length).toBe(1);
      done();
    });
    it("lte", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.lte(4500) })
        .valueMap();
      expect(vertices.length).toBe(2);
      done();
    });
    it("gt", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.gt(4500) })
        .valueMap();
      expect(vertices.length).toBe(1);
      done();
    });
    it("lte", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.gte(4500) })
        .valueMap();
      expect(vertices.length).toBe(2);
      done();
    });
    it("inside", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.inside(4400,5000) })
        .valueMap();
      expect(vertices.length).toBe(1);
      done();
    });
    it("outside", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.outside(4400,4600) })
        .valueMap();
      expect(vertices.length).toBe(2);
      done();
    });
    it("between", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.between(4000,4600) })
        .valueMap();
      expect(vertices.length).toBe(2);
      done();
    });
    it("within", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.within([5000,4000,4500]) })
        .valueMap();
      expect(vertices.length).toBe(3);
      done();
    });
    it("without", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: P.without([4000]) })
        .valueMap();
      expect(vertices.length).toBe(2);
      done();
    });
    it("custom single value", async (done) => {
      let customGT = P.custom((key,i)=>`${key}>=${i}`)
      let vertices = await g()
        .V("god")
        .has({ age: customGT(4500) })
        .valueMap();
      expect(vertices.length).toBe(2);
      done();
    });
    it("custom array", async (done) => {
      let customWithin = P.custom((key,i,value)=>`${key} = ANY (${i}::${typeof value[0]==='string'?'text':'numeric'}[])`)
      let vertices = await g()
        .V("god")
        .has({ age: customWithin([5000,4000,4500]) })
        .valueMap();
      expect(vertices.length).toBe(3);
      done();
    });
    it("custom N params", async (done) => {
      let customWithin = P.custom((key,i)=>`${key} = ANY (${i}::numeric[])`)
      let vertices = await g()
        .V("god")
        .has({ age: customWithin(5000,4000,4500) })
        .valueMap();
      expect(vertices.length).toBe(3);
      done();
    });
  });
  describe("primitive values", () => {
    it("mixed", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: 5000, name:'jupiter' })
        .valueMap();
      expect(vertices.length).toBe(1);
      done();
    });
    it("string", async (done) => {
      let vertices = await g()
        .V("god")
        .out("god__lives__location")
        .has({ name: "sky" })
        .valueMap();
      expect(vertices.length).toBe(1);
      done();
    });
    it("number", async (done) => {
      let vertices = await g()
        .V("god")
        .has({ age: 5000 })
        .valueMap();
      expect(vertices.length).toBe(1);
      done();
    });
  });
});
describe("hasId()", () => {
  it("(id) should remove items that do not have matching id", async (done) => {
    let gods = await g().V('god').toList()
    expect(gods.length).toBe(3);

    let singleID = await g()
      .V("god")
      .hasId(gods[0])
      .toSet();
    expect(singleID.length).toBe(1);

    let multipleIds = await g()
      .V("god")
      .hasId([gods[0],gods[1]])
      .toSet();
    expect(multipleIds.length).toBe(2);
    done();
  });
});

/****************************  Traversal Steps  **************************/

describe("out(label)", () => {
  it("should return: current vertex -> all outgoing edges{{label}} -> to vertices", async (done) => {
    let vertices = await g()
      .V("god")
      .out("god__lives__location")
      .valueMap();

    expect(vertices.length).toBe(3);
    vertices.forEach((v) => {
      expect(['sea','sky','tartarus'].includes(v.name)).toBe(true);
    });
    done();
  });
});

describe("outE(label)", () => {
  it("should return: current vertex -> all outgoing edges{{label}}", async (done) => {
    let vertices = await g()
      .V("god")
      .outE("god__lives__location")
      .valueMap();

    expect(vertices.length).toBe(3);
    vertices.forEach((v) => {
      expect(['loves fresh breezes','loves waves','no fear of death'].includes(v.reason)).toBe(true);
    });
    done();
  });
});

describe("in(label)", () => {
  it("should return: current vertex -> all incoming edges{{label}} -> from vertices", async (done) => {
    let vertices = await g()
      .V("location")
      .in("god__lives__location")
      .valueMap();

    expect(vertices.length).toBe(3);
    vertices.forEach((v) => {
      expect(['neptune','jupiter','pluto'].includes(v.name)).toBe(true);
    });
    done();
  });
});

describe("inE(label)", () => {
  it("should return: all incoming edges{{label}} -> to current vertex", async (done) => {
    let vertices = await g()
      .V("location")
      .inE("god__lives__location")
      .valueMap();

    expect(vertices.length).toBe(3);
    vertices.forEach((v) => {
      expect(['loves fresh breezes','loves waves','no fear of death'].includes(v.reason)).toBe(true);
    });
    done();
  });
});

describe("outV()", () => {
  it("should return: outgoing vertex -> to current edge", async (done) => {
    let vertices = await g()
      .E('god__lives__location')
      .outV()
      .valueMap();

    expect(vertices.length).toBe(3);
    vertices.forEach((v) => {
      expect(['neptune','jupiter','pluto'].includes(v.name)).toBe(true);
    });
    done();
  });
});

describe("inV()", () => {
  it("should return: incoming vertex <- from current edge", async (done) => {
    let vertices = await g()
      .E('god__lives__location')
      .inV()
      .valueMap();

    expect(vertices.length).toBe(3);
    vertices.forEach((v) => {
      expect(['sea','sky','tartarus'].includes(v.name)).toBe(true);
    });
    done();
  });
});

describe("where()", () => {
  it("should return the previous collection type filtered by where traversal", async (done) => {
    let vertices = await g()
      .V("god")
      .where((t)=>t.out('god__lives__location').has({name:'sky'}))
      .valueMap();

    expect(vertices.length).toBe(1);
    expect(vertices[0].name).toBe('jupiter')
    done();
  });
  it("should return the previous collection type filtered by where traversal", async (done) => {
    let vertices = await g()
      .V("god")
      .where((t)=>t
        .out("god__brother__god")
        .out('god__lives__location')
        .has({name:'sky'})
      )
      .where((t)=>t
        .out("god__pet__monster")
      )
      .valueMap();

    expect(vertices.length).toBe(1);
    expect(vertices[0].name).toBe('pluto')
    done();
  });
});
